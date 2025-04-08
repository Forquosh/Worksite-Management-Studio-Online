package main

import (
	"net/http"

	"github.com/Forquosh/Worksite-Management-Studio-Online/backend/controller"
	"github.com/Forquosh/Worksite-Management-Studio-Online/backend/repository"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	// New Echo instance
	e := echo.New()

	// CORS middleware
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"http://localhost:5173", "http://127.0.0.1:5173"}, // Your frontend URL
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowHeaders: []string{"Content-Type", "Authorization", "Accept"},
		AllowCredentials: true,
	}))

	//  Repository and Controller instances
	repo := repository.NewRepository()
	ctrl := controller.NewController(repo)

	// API routes
	e.GET("/api/health", ctrl.HealthCheck)
	e.GET("/api/workers", ctrl.GetAllWorkers)
	e.GET("/api/workers/:id", ctrl.GetWorker)
	e.POST("/api/workers", ctrl.CreateWorker)
	e.PUT("/api/workers/:id", ctrl.UpdateWorker)
	e.DELETE("/api/workers/:id", ctrl.DeleteWorker)

	// Start the server
	e.Logger.Fatal(e.Start(":8080"))
}