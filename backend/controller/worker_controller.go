package controller

import (
	"net/http"
	"strconv"

	"github.com/Forquosh/Worksite-Management-Studio-Online/backend/model"
	"github.com/Forquosh/Worksite-Management-Studio-Online/backend/repository"
	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
)

type WorkerController struct {
	repo *repository.WorkerRepository
	validate *validator.Validate
}

func NewWorkerController(repo *repository.WorkerRepository) *WorkerController {
	return &WorkerController{
		repo: repo,
		validate: validator.New(),
	}
}

// getUserID extracts the user ID from the context
func getUserID(c echo.Context) (uint, error) {
	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return 0, echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}
	return userID, nil
}

// GetAllWorkers handles GET /api/workers
func (c *WorkerController) GetAllWorkers(ctx echo.Context) error {
	// Get user ID from context
	userID, err := getUserID(ctx)
	if err != nil {
		return err
	}

	// Get query parameters for filtering and sorting
	filters := make(map[string]interface{})

	// Handle search term
	if search := ctx.QueryParam("search"); search != "" {
		filters["search"] = search
	}

	// Handle position filter
	if position := ctx.QueryParam("position"); position != "" {
		filters["position"] = position
	}

	// Handle age range filters
	if minAge := ctx.QueryParam("min_age"); minAge != "" {
		if age, err := strconv.Atoi(minAge); err == nil {
			filters["min_age"] = age
		}
	}
	if maxAge := ctx.QueryParam("max_age"); maxAge != "" {
		if age, err := strconv.Atoi(maxAge); err == nil {
			filters["max_age"] = age
		}
	}

	// Handle salary range filters
	if minSalary := ctx.QueryParam("min_salary"); minSalary != "" {
		if salary, err := strconv.Atoi(minSalary); err == nil {
			filters["min_salary"] = salary
		}
	}
	if maxSalary := ctx.QueryParam("max_salary"); maxSalary != "" {
		if salary, err := strconv.Atoi(maxSalary); err == nil {
			filters["max_salary"] = salary
		}
	}

	sortBy := ctx.QueryParam("sort_by")
	sortOrder := ctx.QueryParam("sort_order")

	// Get pagination parameters
	page := 1
	pageSize := 10

	if pageParam := ctx.QueryParam("page"); pageParam != "" {
		if parsedPage, err := strconv.Atoi(pageParam); err == nil && parsedPage > 0 {
			page = parsedPage
		}
	}

	if pageSizeParam := ctx.QueryParam("page_size"); pageSizeParam != "" {
		if parsedPageSize, err := strconv.Atoi(pageSizeParam); err == nil && parsedPageSize > 0 {
			pageSize = parsedPageSize
		}
	}

	workers, total, err := c.repo.GetAll(userID, filters, sortBy, sortOrder, page, pageSize)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	// Return paginated response
	return ctx.JSON(http.StatusOK, map[string]interface{}{
		"data":     workers,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// GetWorker handles GET /api/workers/:id
func (c *WorkerController) GetWorker(ctx echo.Context) error {
	// Get user ID from context
	userID, err := getUserID(ctx)
	if err != nil {
		return err
	}

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	worker, err := c.repo.GetByID(uint(id), userID)
	if err != nil {
		return ctx.JSON(http.StatusNotFound, map[string]string{"error": "Worker not found"})
	}

	return ctx.JSON(http.StatusOK, worker)
}

// CreateWorker handles POST /api/workers
func (c *WorkerController) CreateWorker(ctx echo.Context) error {
	// Get user ID from context
	userID, err := getUserID(ctx)
	if err != nil {
		return err
	}

	var worker model.Worker
	if err := ctx.Bind(&worker); err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	// Set user ID for the worker
	worker.UserID = userID

	// Validate worker
	if err := c.validate.Struct(worker); err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	if err := c.repo.Create(&worker); err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return ctx.JSON(http.StatusCreated, worker)
}

// UpdateWorker handles PUT /api/workers/:id
func (c *WorkerController) UpdateWorker(ctx echo.Context) error {
	// Get user ID from context
	userID, err := getUserID(ctx)
	if err != nil {
		return err
	}

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	var worker model.Worker
	if err := ctx.Bind(&worker); err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	// Set worker ID and user ID
	worker.ID = uint(id)
	worker.UserID = userID

	if err := c.repo.Update(&worker, userID); err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return ctx.JSON(http.StatusOK, worker)
}

// DeleteWorker handles DELETE /api/workers/:id
func (c *WorkerController) DeleteWorker(ctx echo.Context) error {
	// Get user ID from context
	userID, err := getUserID(ctx)
	if err != nil {
		return err
	}

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	if err := c.repo.Delete(uint(id), userID); err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return ctx.NoContent(http.StatusNoContent)
}

// AddToProject handles POST /api/workers/:workerId/projects/:projectId
func (c *WorkerController) AddToProject(ctx echo.Context) error {
	// Get user ID from context
	userID, err := getUserID(ctx)
	if err != nil {
		return err
	}

	workerId, err := strconv.ParseUint(ctx.Param("workerId"), 10, 32)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid worker ID"})
	}

	projectId, err := strconv.ParseUint(ctx.Param("projectId"), 10, 32)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid project ID"})
	}

	if err := c.repo.AddToProject(uint(workerId), uint(projectId), userID); err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return ctx.NoContent(http.StatusNoContent)
}

// RemoveFromProject handles DELETE /api/workers/:workerId/projects/:projectId
func (c *WorkerController) RemoveFromProject(ctx echo.Context) error {
	// Get user ID from context
	userID, err := getUserID(ctx)
	if err != nil {
		return err
	}

	workerId, err := strconv.ParseUint(ctx.Param("workerId"), 10, 32)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid worker ID"})
	}

	projectId, err := strconv.ParseUint(ctx.Param("projectId"), 10, 32)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid project ID"})
	}

	if err := c.repo.RemoveFromProject(uint(workerId), uint(projectId), userID); err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return ctx.NoContent(http.StatusNoContent)
} 