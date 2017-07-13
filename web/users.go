package web

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/autograde/aguis/database"
	"github.com/autograde/aguis/models"
	"github.com/jinzhu/gorm"
	"github.com/labstack/echo"
)

// GetSelf redirects to GetUser with the current user's id.
func GetSelf() echo.HandlerFunc {
	return func(c echo.Context) error {
		user := c.Get("user").(*models.User)
		return c.Redirect(http.StatusFound, fmt.Sprintf("/api/v1/users/%d", user.ID))
	}
}

// GetUser returns information about the user associated with the id query.
func GetUser(db database.Database) echo.HandlerFunc {
	return func(c echo.Context) error {
		id, err := strconv.ParseUint(c.Param("id"), 10, 64)
		if err != nil || id == 0 {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid user id")
		}

		user, err := db.GetUser(id)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return c.NoContent(http.StatusNotFound)
			}
			return err

		}

		return c.JSONPretty(http.StatusFound, user, "\t")
	}
}

// GetUsers returns all the users in the database.
// TODO: Add filtering, i.e, ?course=A123.
func GetUsers(db database.Database) echo.HandlerFunc {
	return func(c echo.Context) error {
		users, err := db.GetUsers()
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return c.NoContent(http.StatusNotFound)
			}
			return err

		}
		return c.JSONPretty(http.StatusFound, users, "\t")
	}
}