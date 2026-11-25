// Package media holds the posters of the demo catalogue (db/seed/02_catalogue.sql).
//
// They are compiled into the API so a fresh checkout shows every seeded event
// with its image - nothing to copy into the uploads volume - and so the website
// and the phone app both load them from the API they already talk to. The
// database stores the relative path /media/<file>; clients prefix their API origin.
package media

import (
	"embed"
	"io/fs"
)

//go:embed files/*.jpg
var embedded embed.FS

// Files is the poster directory, rooted so names are flat ("queen-symphony.jpg").
var Files = func() fs.FS {
	sub, err := fs.Sub(embedded, "files")
	if err != nil {
		panic(err)
	}
	return sub
}()

// URLPrefix is where the posters are served.
const URLPrefix = "/media/"
