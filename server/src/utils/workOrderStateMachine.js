'use strict';

/**
 * Work Order State Machine Definition per docs/diagrams/06-work-order-state-diagram.md
 * Statuses: OPEN -> ASSIGNED -> IN_PROGRESS -> ON_HOLD -> COMPLETED -> CLOSED
 */

const ALLOWED_TRANSITIONS = {
  OPEN: ['ASSIGNED', 'CLOSED'],
  ASSIGNED: ['IN_PROGRESS', 'ON_HOLD'],
  IN_PROGRESS: ['ON_HOLD', 'COMPLETED'],
  ON_HOLD: ['IN_PROGRESS'],
  COMPLETED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [], // Terminal state
};

// Define role-based permissions for transitions
const ROLE_PERMITTED_TRANSITIONS = {
  ADMIN: {
    OPEN: ['ASSIGNED', 'CLOSED'],
    ASSIGNED: ['IN_PROGRESS', 'ON_HOLD', 'CLOSED'],
    IN_PROGRESS: ['ON_HOLD', 'COMPLETED', 'CLOSED'],
    ON_HOLD: ['IN_PROGRESS', 'CLOSED'],
    COMPLETED: ['CLOSED', 'IN_PROGRESS'],
    CLOSED: [],
  },
  TECHNICIAN: {
    OPEN: [], // Only Admin assigns/opens
    ASSIGNED: ['IN_PROGRESS', 'ON_HOLD'],
    IN_PROGRESS: ['ON_HOLD', 'COMPLETED'],
    ON_HOLD: ['IN_PROGRESS'],
    COMPLETED: [], // Technician cannot close without Admin verification
    CLOSED: [],
  },
  REQUESTER: {
    OPEN: [],
    ASSIGNED: [],
    IN_PROGRESS: [],
    ON_HOLD: [],
    COMPLETED: [],
    CLOSED: [],
  },
};

function isValidTransition(fromStatus, toStatus, userRole) {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return false;

  const roleRules = ROLE_PERMITTED_TRANSITIONS[userRole] || {};
  const allowedForRole = roleRules[fromStatus] || [];

  return allowedForRole.includes(toStatus);
}

module.exports = {
  ALLOWED_TRANSITIONS,
  ROLE_PERMITTED_TRANSITIONS,
  isValidTransition,
};
