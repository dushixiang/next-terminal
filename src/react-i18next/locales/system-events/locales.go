// Package systemevents embeds the notification translations shared by Go and the frontend.
package systemevents

import "embed"

// Locales contains the shared translations, embedded into the Go binary at build time.
//
//go:embed *.json
var Locales embed.FS
