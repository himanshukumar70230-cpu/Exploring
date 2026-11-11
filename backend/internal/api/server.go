package api

import (
	"context"
	"log"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/bidline/backend/internal/ai"
	"github.com/bidline/backend/internal/auth"
	"github.com/bidline/backend/internal/config"
	"github.com/bidline/backend/internal/payments"
	"github.com/bidline/backend/internal/store"
)

type contextKey string

const userContextKey contextKey = "bidline-user"

type Server struct {
	cfg     config.Config
	store   *store.Store
	auth    *auth.Authenticator
	ai      *ai.Client
	paypal  *payments.PayPal
	limiter *rateLimiter
	started time.Time
}

func New(cfg config.Config, db *store.Store, authenticator *auth.Authenticator, gemini *ai.Client, paypal *payments.PayPal) *Server {
	return &Server{
		cfg:     cfg,
		store:   db,
		auth:    authenticator,
		ai:      gemini,
		paypal:  paypal,
		limiter: newRateLimiter(),
		started: time.Now(),
	}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	// Public infrastructure only. Every product route requires a verified user.
	mux.HandleFunc("GET /healthz", s.handleHealth)
	mux.HandleFunc("GET /v1/meta", s.handleMeta)
	mux.HandleFunc("POST /v1/auth/dev", s.handleDevLogin)
	mux.HandleFunc("POST /v1/webhooks/paypal", s.handlePayPalWebhook)

	protected := http.NewServeMux()
	protected.HandleFunc("GET /v1/auth/me", s.handleMe)
	protected.HandleFunc("POST /v1/auth/sync", s.handleSync)

	protected.HandleFunc("GET /v1/agents", s.handleListAgents)
	protected.HandleFunc("POST /v1/agents", s.handleCreateAgent)
	protected.HandleFunc("GET /v1/agents/{id}", s.handleGetAgent)
	protected.HandleFunc("PATCH /v1/agents/{id}", s.handleUpdateAgent)

	protected.HandleFunc("GET /v1/jobs", s.handleListJobs)
	protected.HandleFunc("POST /v1/jobs", s.handleCreateJob)
	protected.HandleFunc("GET /v1/jobs/{id}", s.handleGetJob)
	protected.HandleFunc("POST /v1/jobs/{id}/bids", s.handleCreateBid)
	protected.HandleFunc("POST /v1/jobs/{id}/negotiation", s.handleNegotiation)
	protected.HandleFunc("POST /v1/jobs/{id}/award", s.handleAward)
	protected.HandleFunc("POST /v1/jobs/{id}/ai/bid", s.handleAIBid)
	protected.HandleFunc("POST /v1/jobs/{id}/ai/negotiate", s.handleAINegotiate)

	protected.HandleFunc("POST /v1/ai/brief", s.handleAIBrief)

	protected.HandleFunc("GET /v1/deals", s.handleListDeals)
	protected.HandleFunc("GET /v1/deals/{id}", s.handleGetDeal)
	protected.HandleFunc("POST /v1/deals/{id}/escrow", s.handleFundEscrow)
	protected.HandleFunc("POST /v1/deals/{id}/milestones/{milestoneId}/submit", s.handleSubmitMilestone)
	protected.HandleFunc("POST /v1/deals/{id}/milestones/{milestoneId}/accept", s.handleAcceptMilestone)
	protected.HandleFunc("POST /v1/deals/{id}/milestones/{milestoneId}/reject", s.handleRejectMilestone)
	protected.HandleFunc("POST /v1/deals/{id}/messages", s.handleDealMessage)
	protected.HandleFunc("POST /v1/deals/{id}/paypal/order", s.handlePayPalOrder)
	protected.HandleFunc("POST /v1/deals/{id}/paypal/capture", s.handlePayPalCapture)

	protected.HandleFunc("GET /v1/wallet", s.handleGetWallet)
	protected.HandleFunc("POST /v1/wallet/withdraw", s.handleWithdraw)

	protected.HandleFunc("GET /v1/activity", s.handleActivity)
	protected.HandleFunc("GET /v1/activity/stream", s.handleActivityStream)
	protected.HandleFunc("GET /v1/dashboard", s.handleDashboard)

	mux.Handle("/", s.requireUser(protected))

	return s.withMiddleware(mux)
}

func (s *Server) withMiddleware(next http.Handler) http.Handler {
	return s.recoverer(s.cors(s.requestLog(next)))
}

func (s *Server) requireUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		identity, err := s.auth.Verify(r.Context(), r.Header.Get("Authorization"))
		if err != nil {
			writeError(w, http.StatusUnauthorized, "unauthorized", "Sign in to continue.")
			return
		}
		user, err := s.store.UpsertUser(r.Context(), identity.Subject, identity.Email, identity.Name, identity.AvatarURL, "both")
		if err != nil {
			log.Printf("upsert user: %v", err)
			writeError(w, http.StatusInternalServerError, "internal_error", "Could not load your account.")
			return
		}
		ctx := context.WithValue(r.Context(), userContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func currentUser(r *http.Request) *store.User {
	user, _ := r.Context().Value(userContextKey).(*store.User)
	return user
}

func (s *Server) recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				log.Printf("panic: %v", recovered)
				writeError(w, http.StatusInternalServerError, "internal_error", "Something went wrong.")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func (s *Server) requestLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		if !strings.HasPrefix(r.URL.Path, "/healthz") {
			log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start).Round(time.Millisecond))
		}
	})
}

func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && s.originAllowed(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Max-Age", "600")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) originAllowed(origin string) bool {
	if strings.EqualFold(strings.TrimRight(origin, "/"), strings.TrimRight(s.cfg.FrontendURL, "/")) {
		return true
	}
	if s.cfg.AppEnv == "production" {
		return false
	}
	host := origin
	if index := strings.Index(host, "://"); index >= 0 {
		host = host[index+3:]
	}
	host = strings.Split(host, ":")[0]
	ip := net.ParseIP(host)
	return host == "localhost" || host == "127.0.0.1" || (ip != nil && ip.IsLoopback())
}
