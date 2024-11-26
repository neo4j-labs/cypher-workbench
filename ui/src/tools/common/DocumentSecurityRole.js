import { USER_ROLE, ALERT_TYPES } from '../../common/Constants';

export default class DocumentSecurityRole {

    role = null;

    constructor (props) {
        this.props = props;
    }

    setRole = (role) => this.role = role;

    getRole = () => this.role;

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
        const role = this.getRole();
        if (allowedRoles.includes(role)) {
            return true;
        } else {
            if (showMessage) {
                alert('Insufficient permission, your role is ' + this.getRoleDisplay(), ALERT_TYPES.WARNING);
            }
            return false;
        }
    }

    canEdit = (showMessage) => 
        this.checkRole([USER_ROLE.OWNER, USER_ROLE.MEMBER], showMessage);
    

    isOwner = (showMessage) => 
        this.checkRole([USER_ROLE.OWNER], showMessage);

    canEditShowMessage = () => 
        this.checkRole([USER_ROLE.OWNER, USER_ROLE.MEMBER], true);
}
