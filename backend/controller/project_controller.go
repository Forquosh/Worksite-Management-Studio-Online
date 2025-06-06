package controller

import (
	"net/http"
	"strconv"

	"github.com/Forquosh/Worksite-Management-Studio-Online/backend/model"
	"github.com/Forquosh/Worksite-Management-Studio-Online/backend/repository"
	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
)

type ProjectController struct {
	repo *repository.ProjectRepository
	validate *validator.Validate
}

func NewProjectController(repo *repository.ProjectRepository) *ProjectController {
	return &ProjectController{
		repo: repo,
		validate: validator.New(),
	}
}

// GetAllProjects handles GET /api/projects
func (c *ProjectController) GetAllProjects(ctx echo.Context) error {
	// Get user ID from context
	userID, err := getUserID(ctx)
	if err != nil {
		return err
	}

	// Get query parameters for filtering and sorting
	filters := make(map[string]interface{})
	if name := ctx.QueryParam("name"); name != "" {
		filters["name"] = name
	}
	if status := ctx.QueryParam("status"); status != "" {
		filters["status"] = status
	}
	if search := ctx.QueryParam("search"); search != "" {
		filters["search"] = search
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

	projects, total, err := c.repo.GetAll(userID, filters, sortBy, sortOrder, page, pageSize)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	// Return paginated response
	return ctx.JSON(http.StatusOK, map[string]interface{}{
		"data":     projects,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// GetProject handles GET /api/projects/:id
func (c *ProjectController) GetProject(ctx echo.Context) error {
	// Get user ID from context
	userID, err := getUserID(ctx)
	if err != nil {
		return err
	}

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	project, err := c.repo.GetByID(uint(id), userID)
	if err != nil {
		return ctx.JSON(http.StatusNotFound, map[string]string{"error": "Project not found"})
	}

	return ctx.JSON(http.StatusOK, project)
}

// CreateProject handles POST /api/projects
func (c *ProjectController) CreateProject(ctx echo.Context) error {
	// Get user ID from context
	userID, err := getUserID(ctx)
	if err != nil {
		return err
	}

	var project model.Project
	if err := ctx.Bind(&project); err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	// Set user ID for the project
	project.UserID = userID

	// Validate project
	if err := c.validate.Struct(project); err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	if err := c.repo.Create(&project); err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return ctx.JSON(http.StatusCreated, project)
}

// UpdateProject handles PUT /api/projects/:id
func (c *ProjectController) UpdateProject(ctx echo.Context) error {
	// Get user ID from context
	userID, err := getUserID(ctx)
	if err != nil {
		return err
	}

	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
	}

	var project model.Project
	if err := ctx.Bind(&project); err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	// Set project ID and user ID
	project.ID = uint(id)
	project.UserID = userID

	if err := c.repo.Update(&project, userID); err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return ctx.JSON(http.StatusOK, project)
}

// DeleteProject handles DELETE /api/projects/:id
func (c *ProjectController) DeleteProject(ctx echo.Context) error {
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

// AssignWorkerToProject handles POST /api/projects/:id/workers
func (c *ProjectController) AssignWorkerToProject(ctx echo.Context) error {
	// Get user ID from context
	userID, err := getUserID(ctx)
	if err != nil {
		return err
	}

	projectId, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid project ID"})
	}

	var request struct {
		WorkerId uint `json:"workerId"`
	}
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	if err := c.repo.AddWorker(uint(projectId), request.WorkerId, userID); err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	project, err := c.repo.GetByID(uint(projectId), userID)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return ctx.JSON(http.StatusOK, project)
}

// GetAvailableWorkers handles GET /api/projects/:id/workers/available
func (c *ProjectController) GetAvailableWorkers(ctx echo.Context) error {
	// Get user ID from context
	userID, err := getUserID(ctx)
	if err != nil {
		return err
	}

	projectId, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid project ID"})
	}

	project, err := c.repo.GetByID(uint(projectId), userID)
	if err != nil {
		return ctx.JSON(http.StatusNotFound, map[string]string{"error": "Project not found"})
	}

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

	// Get all workers with pagination
	workers, total, err := c.repo.GetAllWorkers(userID, page, pageSize)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	// Filter out workers that are already assigned to the project
	availableWorkers := make([]model.Worker, 0)
	for _, worker := range workers {
		isAssigned := false
		for _, assignedWorker := range project.Workers {
			if worker.ID == assignedWorker.ID {
				isAssigned = true
				break
			}
		}
		if !isAssigned {
			availableWorkers = append(availableWorkers, worker)
		}
	}

	// Return paginated response
	return ctx.JSON(http.StatusOK, map[string]interface{}{
		"data":     availableWorkers,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// UnassignWorkerFromProject handles DELETE /api/projects/:id/workers/:workerId
func (c *ProjectController) UnassignWorkerFromProject(ctx echo.Context) error {
	// Get user ID from context
	userID, err := getUserID(ctx)
	if err != nil {
		return err
	}

	projectId, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid project ID"})
	}

	workerId, err := strconv.ParseUint(ctx.Param("workerId"), 10, 32)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid worker ID"})
	}

	if err := c.repo.RemoveWorker(uint(projectId), uint(workerId), userID); err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return ctx.NoContent(http.StatusNoContent)
} 