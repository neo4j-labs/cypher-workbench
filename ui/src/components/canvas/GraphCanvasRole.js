
import { USER_ROLE, ALERT_TYPES } from '../../common/Constants';

export class GraphCanvasRole {

    constructor () {
        this.role = null;
    }

    setRole = (role) => {
        this.role = role;
    }

    getRole = () => {
        return this.role;
    }

    getRoleDisplay = (role) => {
        role = (role) ? role : this.role;
        if (role === USER_ROLE.MEMBER) {
            return 'EDITOR';
        } else {
            return (role) ? role : 'Unknown';
        }
    }

    checkRole = (allowedRoles, showMessage) => {
        // if a single role is passed in, convert it to an array
        allowedRoles = (typeof(allowedRoles) === 'string') ? [allowedRoles] : allowedRoles;
        if (allowedRoles.includes(this.role)) {
            return true;
        } else {
            if (showMessage) {
                alert('Insufficient permission, your role is ' + this.getRoleDisplay(), ALERT_TYPES.WARNING);
            }
            return false;
        }
    }

    canEdit = (showMessage) => {
        return this.checkRole([USER_ROLE.OWNER, USER_ROLE.MEMBER], showMessage);
    }

    isOwner = (showMessage) => {
        return this.checkRole([USER_ROLE.OWNER], showMessage);
    }

    canEditShowMessage = () => {
        return this.checkRole([USER_ROLE.OWNER, USER_ROLE.MEMBER], true);
    }
}

