# defining custom exception models for better readibility and making services framework (fastapi) agnostic


# ******************************************************************************************************************************************************************************************
# EXPENSES
# ******************************************************************************************************************************************************************************************
class ExpenseCreationError(Exception):
    """Generic expense creation error"""
    pass

class ExpenseEditError(Exception):
    """Generic expense edit error"""
    pass


class ExpenseNotFoundError(Exception):
    """Generic fallback"""
    pass

# ******************************************************************************************************************************************************************************************
# GROUPS
# ******************************************************************************************************************************************************************************************
class GroupFullDetailsError(Exception):
    "When get_full_group_details service fails"
    pass

class GroupCalculateBalanceError(Exception):
    """When calculate_balance service fails"""
    pass

class GroupCheckPwJoinError(Exception):
    """When check_join_group (pw auth) service fails"""
    pass

class GroupCheckLinkJoinError(Exception):
    """When check_link_join (link auth) service fails"""
    pass

class GroupAddUserError(Exception):
    """When add_user_group service fails"""
    pass

class GroupShortDetailsError(Exception):
    """When get_short_group_details service fails"""
    pass

class GroupInviteLinkCreateError(Exception):
    """When create_group_invite_service service fails"""
    pass

# generic/reusable
class GroupNotFoundError(Exception):
    """generic error msg for invalid inputs"""


# ******************************************************************************************************************************************************************************************
# AUTH
# ******************************************************************************************************************************************************************************************
class AuthJwtCreationError(Exception):
    """
    Important exception for auth to check jwt creation worked. 
    Dont want to pass an empty token to frontend as app relies on it
    """
    pass

class AuthCredentialsError(Exception):
    """Generic credentials check"""
    pass