package auth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/bidline/backend/internal/config"
)

const DevIssuer = "bidline-dev"

var ErrUnauthorized = errors.New("unauthorized")

// Identity is the verified caller behind a bearer token.
type Identity struct {
	Subject   string `json:"subject"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatarUrl"`
	Provider  string `json:"provider"`
}

// Authenticator verifies Clerk session tokens and, only when explicitly
// enabled, local development tokens.
type Authenticator struct {
	cfg    config.Config
	client *http.Client

	mu       sync.RWMutex
	keys     map[string]*rsa.PublicKey
	fetched  time.Time
	jwksURL  string
	clerkOn  bool
	devOn    bool
	profiles map[string]cachedProfile
}

type cachedProfile struct {
	Email     string
	Name      string
	AvatarURL string
	fetched   time.Time
}

func New(cfg config.Config) *Authenticator {
	jwksURL := strings.TrimSpace(cfg.ClerkJWKSURL)
	if jwksURL == "" && cfg.ClerkIssuer != "" {
		jwksURL = strings.TrimRight(cfg.ClerkIssuer, "/") + "/.well-known/jwks.json"
	}
	return &Authenticator{
		cfg:      cfg,
		client:   &http.Client{Timeout: 10 * time.Second},
		keys:     map[string]*rsa.PublicKey{},
		jwksURL:  jwksURL,
		clerkOn:  cfg.ClerkIssuer != "" && jwksURL != "",
		devOn:    cfg.AuthDevMode && cfg.AppEnv != "production",
		profiles: map[string]cachedProfile{},
	}
}

func (a *Authenticator) ClerkEnabled() bool { return a.clerkOn }
func (a *Authenticator) DevEnabled() bool   { return a.devOn }

// Verify validates a bearer token and returns the caller identity.
func (a *Authenticator) Verify(ctx context.Context, raw string) (*Identity, error) {
	raw = strings.TrimSpace(strings.TrimPrefix(raw, "Bearer "))
	if raw == "" {
		return nil, ErrUnauthorized
	}

	unverified, _, err := jwt.NewParser().ParseUnverified(raw, jwt.MapClaims{})
	if err != nil {
		return nil, ErrUnauthorized
	}
	claims, ok := unverified.Claims.(jwt.MapClaims)
	if !ok {
		return nil, ErrUnauthorized
	}
	issuer, _ := claims["iss"].(string)

	if issuer == DevIssuer {
		if !a.devOn {
			return nil, errors.New("development auth is disabled")
		}
		return a.verifyDev(raw, claims)
	}
	if !a.clerkOn {
		return nil, errors.New("clerk is not configured; enable AUTH_DEV_MODE for local development")
	}
	return a.verifyClerk(ctx, raw)
}

func (a *Authenticator) verifyDev(raw string, claims jwt.MapClaims) (*Identity, error) {
	token, err := jwt.Parse(raw, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method %v", token.Header["alg"])
		}
		return []byte(a.cfg.DevAuthSecret), nil
	}, jwt.WithValidMethods([]string{"HS256"}), jwt.WithIssuer(DevIssuer), jwt.WithExpirationRequired())
	if err != nil || !token.Valid {
		return nil, ErrUnauthorized
	}
	subject, _ := claims["sub"].(string)
	email, _ := claims["email"].(string)
	name, _ := claims["name"].(string)
	if subject == "" {
		return nil, ErrUnauthorized
	}
	return &Identity{Subject: subject, Email: email, Name: name, Provider: "dev"}, nil
}

func (a *Authenticator) verifyClerk(ctx context.Context, raw string) (*Identity, error) {
	token, err := jwt.Parse(raw, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method %v", token.Header["alg"])
		}
		kid, _ := token.Header["kid"].(string)
		key, err := a.key(ctx, kid)
		if err != nil {
			return nil, err
		}
		return key, nil
	}, jwt.WithValidMethods([]string{"RS256"}), jwt.WithIssuer(a.cfg.ClerkIssuer), jwt.WithExpirationRequired())
	if err != nil || !token.Valid {
		return nil, ErrUnauthorized
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, ErrUnauthorized
	}
	subject, _ := claims["sub"].(string)
	if subject == "" {
		return nil, ErrUnauthorized
	}
	email, _ := claims["email"].(string)
	name, _ := claims["name"].(string)
	if name == "" {
		first, _ := claims["first_name"].(string)
		last, _ := claims["last_name"].(string)
		name = strings.TrimSpace(first + " " + last)
	}
	avatar, _ := claims["picture"].(string)
	identity := &Identity{Subject: subject, Email: email, Name: name, AvatarURL: avatar, Provider: "clerk"}
	a.hydrateClerkProfile(ctx, identity)
	return identity, nil
}

// Session tokens do not carry profile fields unless a custom claim template is
// configured. Fill the gaps from Clerk's Backend API and cache the result.
func (a *Authenticator) hydrateClerkProfile(ctx context.Context, identity *Identity) {
	if identity.Email != "" && identity.Name != "" && identity.AvatarURL != "" {
		return
	}
	if strings.TrimSpace(a.cfg.ClerkSecretKey) == "" {
		return
	}

	a.mu.RLock()
	cached, ok := a.profiles[identity.Subject]
	a.mu.RUnlock()
	if ok && time.Since(cached.fetched) < 15*time.Minute {
		fillIdentity(identity, cached)
		return
	}

	profile, err := a.fetchClerkProfile(ctx, identity.Subject)
	if err != nil {
		if ok {
			fillIdentity(identity, cached)
		}
		return
	}

	a.mu.Lock()
	if len(a.profiles) > 5000 {
		for subject, entry := range a.profiles {
			if time.Since(entry.fetched) > time.Hour {
				delete(a.profiles, subject)
			}
		}
	}
	a.profiles[identity.Subject] = profile
	a.mu.Unlock()
	fillIdentity(identity, profile)
}

func fillIdentity(identity *Identity, profile cachedProfile) {
	if identity.Email == "" {
		identity.Email = profile.Email
	}
	if identity.Name == "" {
		identity.Name = profile.Name
	}
	if identity.AvatarURL == "" {
		identity.AvatarURL = profile.AvatarURL
	}
}

type clerkProfileResponse struct {
	FirstName             string `json:"first_name"`
	LastName              string `json:"last_name"`
	Username              string `json:"username"`
	ImageURL              string `json:"image_url"`
	PrimaryEmailAddressID string `json:"primary_email_address_id"`
	EmailAddresses        []struct {
		ID           string `json:"id"`
		EmailAddress string `json:"email_address"`
	} `json:"email_addresses"`
}

func (a *Authenticator) fetchClerkProfile(ctx context.Context, userID string) (cachedProfile, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet,
		"https://api.clerk.com/v1/users/"+url.PathEscape(userID), nil)
	if err != nil {
		return cachedProfile{}, err
	}
	request.Header.Set("Authorization", "Bearer "+a.cfg.ClerkSecretKey)
	request.Header.Set("Accept", "application/json")

	response, err := a.client.Do(request)
	if err != nil {
		return cachedProfile{}, fmt.Errorf("fetch clerk profile: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return cachedProfile{}, fmt.Errorf("fetch clerk profile: status %d", response.StatusCode)
	}

	var payload clerkProfileResponse
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return cachedProfile{}, err
	}

	email := ""
	for _, item := range payload.EmailAddresses {
		if item.ID == payload.PrimaryEmailAddressID {
			email = item.EmailAddress
			break
		}
	}
	if email == "" && len(payload.EmailAddresses) > 0 {
		email = payload.EmailAddresses[0].EmailAddress
	}

	name := strings.TrimSpace(payload.FirstName + " " + payload.LastName)
	if name == "" {
		name = payload.Username
	}

	return cachedProfile{
		Email:     email,
		Name:      name,
		AvatarURL: payload.ImageURL,
		fetched:   time.Now(),
	}, nil
}

func (a *Authenticator) key(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	a.mu.RLock()
	key, ok := a.keys[kid]
	fresh := time.Since(a.fetched) < time.Hour
	a.mu.RUnlock()
	if ok && fresh {
		return key, nil
	}
	if err := a.refresh(ctx); err != nil {
		if ok {
			return key, nil
		}
		return nil, err
	}
	a.mu.RLock()
	defer a.mu.RUnlock()
	key, ok = a.keys[kid]
	if !ok {
		return nil, fmt.Errorf("no signing key for kid %q", kid)
	}
	return key, nil
}

type jwksResponse struct {
	Keys []struct {
		Kid string `json:"kid"`
		Kty string `json:"kty"`
		Alg string `json:"alg"`
		Use string `json:"use"`
		N   string `json:"n"`
		E   string `json:"e"`
	} `json:"keys"`
}

func (a *Authenticator) refresh(ctx context.Context) error {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, a.jwksURL, nil)
	if err != nil {
		return err
	}
	response, err := a.client.Do(request)
	if err != nil {
		return fmt.Errorf("fetch clerk jwks: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("fetch clerk jwks: status %d", response.StatusCode)
	}
	var payload jwksResponse
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return err
	}

	keys := map[string]*rsa.PublicKey{}
	for _, item := range payload.Keys {
		if !strings.EqualFold(item.Kty, "RSA") {
			continue
		}
		modulus, err := base64.RawURLEncoding.DecodeString(item.N)
		if err != nil {
			continue
		}
		exponent, err := base64.RawURLEncoding.DecodeString(item.E)
		if err != nil {
			continue
		}
		keys[item.Kid] = &rsa.PublicKey{
			N: new(big.Int).SetBytes(modulus),
			E: int(new(big.Int).SetBytes(exponent).Int64()),
		}
	}
	if len(keys) == 0 {
		return errors.New("clerk jwks contained no RSA keys")
	}

	a.mu.Lock()
	a.keys = keys
	a.fetched = time.Now()
	a.mu.Unlock()
	return nil
}

// NewDevToken mints a local development token. It is only accepted when
// AUTH_DEV_MODE is on and APP_ENV is not production.
func (a *Authenticator) NewDevToken(email, name string) (string, time.Time, error) {
	if !a.devOn {
		return "", time.Time{}, errors.New("development auth is disabled")
	}
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return "", time.Time{}, errors.New("email is required")
	}
	if name == "" {
		name = strings.Split(email, "@")[0]
	}
	expires := time.Now().Add(7 * 24 * time.Hour)
	claims := jwt.MapClaims{
		"iss":   DevIssuer,
		"sub":   "dev:" + email,
		"email": email,
		"name":  name,
		"iat":   time.Now().Unix(),
		"exp":   expires.Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(a.cfg.DevAuthSecret))
	return signed, expires, err
}
