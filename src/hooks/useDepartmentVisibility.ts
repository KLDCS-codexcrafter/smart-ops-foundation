/**
 * @file        useDepartmentVisibility.ts
 * @sprint      T-Phase-1.2.6f-pre-1
 * @purpose     SD-16 department-scoped visibility. Per-card role exceptions.
 * @decisions   D-232, D-233
 * @disciplines SD-15, SD-16
 * @[JWT]       GET /api/auth/me/visibility?card={cardArea}&entity={entityCode}
 */
import { useMemo } from 'react';
import { useCurrentUser } from './useCurrentUser';

export type DeptCardArea = 'requestx' | 'procure360' | 'storehub';

export interface VisibilityResult {
  canViewAllDepartments: boolean;
  myDepartmentId: string | null;
  myAccessibleDepartmentIds: string[];
  myAccessibleGodownIds: string[];
  reason: 'own_dept' | 'all_via_role_exception' | 'all_via_admin' | 'no_access';
}

export function useDepartmentVisibility(cardArea: DeptCardArea): VisibilityResult {
  const user = useCurrentUser();

  return useMemo<VisibilityResult>(() => {
    if (!user) {
      return {
        canViewAllDepartments: false,
        myDepartmentId: null,
        myAccessibleDepartmentIds: [],
        myAccessibleGodownIds: [],
        reason: 'no_access',
      };
    }

    if (user.role === 'super_admin' || user.role === 'tenant_admin') {
      return {
        canViewAllDepartments: true,
        myDepartmentId: user.department_id,
        myAccessibleDepartmentIds: [],
        myAccessibleGodownIds: [],
        reason: 'all_via_admin',
      };
    }

    if (cardArea === 'storehub' && user.role === 'operations' && user.subrole === 'store_officer') {
      const godowns = user.accessible_godown_ids.length
        ? user.accessible_godown_ids
        : user.default_godown_id
          ? [user.default_godown_id]
          : [];
      return {
        canViewAllDepartments: true,
        myDepartmentId: user.department_id,
        myAccessibleDepartmentIds: [],
        myAccessibleGodownIds: godowns,
        reason: 'all_via_role_exception',
      };
    }

    if (cardArea === 'procure360' && user.role === 'operations' && user.subrole === 'procurement_officer') {
      return {
        canViewAllDepartments: true,
        myDepartmentId: user.department_id,
        myAccessibleDepartmentIds: [],
        myAccessibleGodownIds: [],
        reason: 'all_via_role_exception',
      };
    }

    if (user.role === 'finance') {
      return {
        canViewAllDepartments: true,
        myDepartmentId: user.department_id,
        myAccessibleDepartmentIds: [],
        myAccessibleGodownIds: [],
        reason: 'all_via_role_exception',
      };
    }

    return {
      canViewAllDepartments: false,
      myDepartmentId: user.department_id,
      myAccessibleDepartmentIds: user.department_id ? [user.department_id] : [],
      myAccessibleGodownIds: [],
      reason: 'own_dept',
    };
  }, [user, cardArea]);
}
