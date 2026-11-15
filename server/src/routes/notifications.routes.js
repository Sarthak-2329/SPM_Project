'use strict';

const { Router } = require('express');
const notificationService = require('../services/notification.service');
const { authenticate } = require('../middleware/auth');
const { sendSuccess } = require('../utils/response');
const { parsePagination } = require('../utils/pagination');

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { skip, take, page, limit } = parsePagination(req.query);
    const result = await notificationService.getUserNotifications(req.user.id, { skip, take });
    return sendSuccess(res, {
      message: 'Notifications retrieved',
      data: {
        items: result.items,
        unreadCount: result.unreadCount,
        meta: {
          total: result.total,
          page,
          limit,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user.id);
    return sendSuccess(res, { message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    return sendSuccess(res, { message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
