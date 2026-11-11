package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

func (s *Server) handleActivity(w http.ResponseWriter, r *http.Request) {
	limit := 50
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			limit = parsed
		}
	}
	items, err := s.store.ListActivity(r.Context(), limit)
	if err != nil {
		storeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"activity": items, "count": len(items)})
}

// handleActivityStream keeps a lightweight SSE connection open. The frontend
// proxies this through its own authenticated route so tokens stay server-side.
func (s *Server) handleActivityStream(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "stream_unsupported", "Streaming is not supported here.")
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	snapshot, err := s.store.ListActivity(r.Context(), 20)
	if err == nil {
		writeSSE(w, "snapshot", snapshot)
	}
	fmt.Fprint(w, ": connected\n\n")
	flusher.Flush()

	cursor := time.Now().UTC().Format(time.RFC3339)
	ticker := time.NewTicker(3 * time.Second)
	ping := time.NewTicker(20 * time.Second)
	defer ticker.Stop()
	defer ping.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ping.C:
			fmt.Fprint(w, ": ping\n\n")
			flusher.Flush()
		case <-ticker.C:
			items, err := s.store.ActivityAfter(r.Context(), cursor, 50)
			if err != nil {
				continue
			}
			for _, item := range items {
				if item.CreatedAt > cursor {
					cursor = item.CreatedAt
				}
				writeSSE(w, "activity", item)
			}
			if len(items) > 0 {
				flusher.Flush()
			}
		}
	}
}

func writeSSE(w http.ResponseWriter, event string, payload any) {
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}
	fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, data)
}
