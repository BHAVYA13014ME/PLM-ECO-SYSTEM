const express = require('express');
const router = express.Router();
const stageService = require('../services/stageService');
const { verifyJWT } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const ApiResponse = require('../utils/ApiResponse');

// All settings routes require authentication + ADMIN role
router.use(verifyJWT, authorizeRoles('ADMIN'));

// GET /settings/stages
router.get('/stages', async (req, res) => {
  const stages = await stageService.getAll();
  new ApiResponse(res, 200, 'Stages fetched successfully', stages);
});

// POST /settings/stages
router.post('/stages', async (req, res) => {
  const stage = await stageService.create(req.body);
  new ApiResponse(res, 201, 'Stage created successfully', stage);
});

// PUT /settings/stages/:id
router.put('/stages/:id', async (req, res) => {
  const stage = await stageService.update(req.params.id, req.body);
  new ApiResponse(res, 200, 'Stage updated successfully', stage);
});

// DELETE /settings/stages/:id
router.delete('/stages/:id', async (req, res) => {
  await stageService.delete(req.params.id);
  new ApiResponse(res, 200, 'Stage deleted successfully');
});

// GET /settings/stages/next/:currentStageId
router.get('/stages/next/:currentStageId', async (req, res) => {
  const nextStage = await stageService.getNext(req.params.currentStageId);
  if (!nextStage) {
    throw { code: 404, message: 'No next stage available' };
  }
  new ApiResponse(res, 200, 'Next stage fetched successfully', nextStage);
});

module.exports = router;
