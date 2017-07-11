package main

import (
	"context"
	"flag"
	"mime"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"time"

	"github.com/Sirupsen/logrus"
	"github.com/autograde/aguis/database"
	"github.com/autograde/aguis/scm"
	"github.com/autograde/aguis/web"
	"github.com/autograde/aguis/web/auth"
	"github.com/gorilla/sessions"
	_ "github.com/jinzhu/gorm/dialects/sqlite"
	"github.com/labstack/echo"
	"github.com/labstack/echo-contrib/session"
	"github.com/labstack/echo/middleware"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/github"
	"github.com/markbates/goth/providers/gitlab"
)

func main() {
	var (
		httpAddr = flag.String("http.addr", ":8080", "HTTP listen address")
		public   = flag.String("http.public", "public", "directory to server static files from")

		baseURL = flag.String("service.url", "localhost", "service base url")

		fake = flag.Bool("provider.fake", false, "enable fake provider")
	)
	flag.Parse()

	setDefaultMimeTypes()

	e := echo.New()
	logger := logrus.New()
	e.Logger = web.EchoLogger{Logger: logger}

	entryPoint := filepath.Join(*public, "index.html")
	if !fileExists(entryPoint) {
		logger.WithField("path", entryPoint).Warn("could not find file")
	}

	store := sessions.NewCookieStore([]byte("secret"))
	store.Options.HttpOnly = true
	store.Options.Secure = true
	gothic.Store = store

	// TODO: Only register if env set.
	goth.UseProviders(
		github.New(os.Getenv("GITHUB_KEY"), os.Getenv("GITHUB_SECRET"), getCallbackURL(*baseURL, "github"), "user", "repo"),
		gitlab.New(os.Getenv("GITLAB_KEY"), os.Getenv("GITLAB_SECRET"), getCallbackURL(*baseURL, "gitlab"), "api"),
	)

	if *fake {
		logger.Warn("fake provider enabled")
		goth.UseProviders(&auth.FakeProvider{Callback: getCallbackURL(*baseURL, "fake")})
	}

	e.HideBanner = true
	e.Use(
		middleware.Recover(),
		web.Logger(logger),
		middleware.Secure(),
		session.Middleware(store),
	)

	db, err := database.NewGormDB("sqlite3", tempFile("agdb.db"), database.Logger{Logger: logger})
	defer db.Close()

	if err != nil {
		logger.WithError(err).Fatal("could not connect to db")
	}

	e.GET("/logout", auth.OAuth2Logout())

	oauth2 := e.Group("/auth/:provider", withProvider, auth.PreAuth(db))
	oauth2.GET("", auth.OAuth2Login(db))
	oauth2.GET("/callback", auth.OAuth2Callback(db))

	// Source code management clients indexed by access token.
	scms := make(map[string]scm.SCM)

	api := e.Group("/api/v1")
	api.Use(auth.AccessControl(db, scms))

	api.GET("/user", web.GetSelf())
	api.GET("/users/:id", web.GetUser(db))
	api.GET("/users", web.GetUsers(db))

	api.GET("/courses", web.ListCourses(db))
	api.POST("/courses", web.NewCourse(logger, db))
	api.POST("/directories", web.ListDirectories())

	index := func(c echo.Context) error {
		return c.File(entryPoint)
	}
	e.GET("/app", index)
	e.GET("/app/*", index)

	// TODO: Whitelisted files only.
	e.Static("/", *public)

	go func() {
		if err := e.Start(*httpAddr); err == http.ErrServerClosed {
			logger.Warn("shutting down theserver")
			return
		}
		logger.WithError(err).Fatal("could not start server")
	}()

	quit := make(chan os.Signal)
	signal.Notify(quit, os.Interrupt)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := e.Shutdown(ctx); err != nil {
		logger.WithError(err).Fatal("failure during server shutdown")
	}
}

// In Windows, mime.type loads the file extensions from registry which
// usually has the wrong content-type associated with the file extension.
// This will enforce the correct types for the most used mime types
func setDefaultMimeTypes() {
	mime.AddExtensionType(".html", "text/html")
	mime.AddExtensionType(".css", "text/css")
	mime.AddExtensionType(".js", "application/javascript")

	// Useful for debugging in browser
	mime.AddExtensionType(".jsx", "application/javascript")
	mime.AddExtensionType(".map", "application/json")
	mime.AddExtensionType(".ts", "application/x-typescript")
}

// makes the oauth2 provider available in the request query so that
// markbates/goth/gothic.GetProviderName can find it.
func withProvider(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		qv := c.Request().URL.Query()
		qv.Set("provider", c.Param("provider"))
		c.Request().URL.RawQuery = qv.Encode()
		return next(c)
	}
}

func getCallbackURL(baseURL string, provider string) string {
	return "https://" + baseURL + "/auth/" + provider + "/callback"
}

func envString(env, fallback string) string {
	e := os.Getenv(env)
	if e == "" {
		return fallback
	}
	return e
}

func tempFile(name string) string {
	return filepath.Join(os.TempDir(), name)
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
