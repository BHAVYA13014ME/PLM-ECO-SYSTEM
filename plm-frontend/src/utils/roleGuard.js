export const canEdit = (user, entity) => ['ADMIN', 'ENGINEER'].includes(user?.role) && entity?.status === 'DRAFT' && !entity?.isLocked;
const hasExplicitApprovers = (stage) => Array.isArray(stage?.approvers) && stage.approvers.length > 0;
const isStageApprover = (user, stage) => {
  if (!user?._id || !hasExplicitApprovers(stage)) return false;
  return stage.approvers.some((approver) => {
    const approverId = typeof approver === 'string' ? approver : approver?._id;
    return approverId?.toString() === user._id.toString();
  });
};
export const canApprove = (user, stage) => {
  if (!stage?.requiresApproval) return false;
  if (user?.role === 'ADMIN') return true;
  return user?.role === 'APPROVER';
};
export const canDelete = (user, entity) => user?.role === 'ADMIN' && entity?.status === 'DRAFT';
export const canValidate = (user, stage) => {
  if (!['ADMIN', 'ENGINEER', 'APPROVER'].includes(user?.role)) return false;
  if (!stage) return false;
  return stage.requiresApproval === false;
};
export const canEditEco = (user, eco) => ['ADMIN', 'ENGINEER'].includes(user?.role) && eco?.status === 'NEW';
export const canCreateEco = (user) => ['ADMIN', 'ENGINEER'].includes(user?.role);
export const canActivateProduct = (user, entity) => user?.role === 'ADMIN' && entity?.status === 'DRAFT';
export const canViewReports = (user) => ['ADMIN', 'ENGINEER', 'APPROVER'].includes(user?.role);

