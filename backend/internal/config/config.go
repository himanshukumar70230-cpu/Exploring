package config

import (
	"bufio"
	"os"
	"strconv"
	"strings"
)

// Config holds every runtime setting for the API.
type Config struct {
	AppEnv       string
	Port         string
	DatabasePath string
	FrontendURL  string

	ClerkSecretKey      string
	ClerkPublishableKey string
	ClerkIssuer         string
	ClerkJWKSURL        string

	AuthDevMode   bool
	DevAuthSecret string
	DevAuthEmail  string

	GeminiAPIKey         string
	GeminiModel          string
	GeminiFallbackModels []string

	PayPalMode         string
	PayPalClientID     string
	PayPalClientSecret string
	PayPalWebhookID    string
	PayPalReturnURL    string
	PayPalCancelURL    string

	PlatformFeeBPS int
}

func Load() Config {
	return Config{
		AppEnv:       env("APP_ENV", "development"),
		Port:         env("PORT", "8080"),
		DatabasePath: env("DATABASE_PATH", "./data/bidline.db"),
		FrontendURL:  env("FRONTEND_URL", "http://localhost:3000"),

		ClerkSecretKey:      env("CLERK_SECRET_KEY", ""),
		ClerkPublishableKey: env("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", ""),
		ClerkIssuer:         strings.TrimRight(env("CLERK_ISSUER", ""), "/"),
		ClerkJWKSURL:        env("CLERK_JWKS_URL", ""),

		AuthDevMode:   envBool("AUTH_DEV_MODE", false),
		DevAuthSecret: env("DEV_AUTH_SECRET", "bidline-dev-secret"),
		DevAuthEmail:  env("DEV_AUTH_EMAIL", "demo@bidline.dev"),

		GeminiAPIKey:         env("GEMINI_API_KEY", ""),
		GeminiModel:          env("GEMINI_MODEL", "gemini-2.5-flash"),
		GeminiFallbackModels: envList("GEMINI_FALLBACK_MODELS", "gemini-3.5-flash"),

		PayPalMode:         env("PAYPAL_MODE", "mock"),
		PayPalClientID:     env("PAYPAL_CLIENT_ID", ""),
		PayPalClientSecret: env("PAYPAL_CLIENT_SECRET", ""),
		PayPalWebhookID:    env("PAYPAL_WEBHOOK_ID", ""),
		PayPalReturnURL:    env("PAYPAL_RETURN_URL", "http://localhost:3000/deals"),
		PayPalCancelURL:    env("PAYPAL_CANCEL_URL", "http://localhost:3000/deals"),

		PlatformFeeBPS: envInt("PLATFORM_FEE_BPS", 150),
	}
}

// LoadDotEnv reads simple KEY=VALUE lines from path without overriding values
// already present in the process environment. Missing files are ignored.
func LoadDotEnv(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		value = strings.Trim(value, `"'`)
		if key == "" || os.Getenv(key) != "" {
			continue
		}
		_ = os.Setenv(key, value)
	}
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func envInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

// envList reads a comma-separated environment variable into a trimmed slice.
func envList(key, fallback string) []string {
	raw := env(key, fallback)
	parts := strings.Split(raw, ",")
	items := make([]string, 0, len(parts))
	for _, part := range parts {
		if item := strings.TrimSpace(part); item != "" {
			items = append(items, item)
		}
	}
	return items
}
