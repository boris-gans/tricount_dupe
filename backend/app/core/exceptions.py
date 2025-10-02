# defining custom exception models for better readibility and making services framework (fastapi) agnostic


# ******************************************************************************************************************************************************************************************
# EXPENSES
# ******************************************************************************************************************************************************************************************
class ExpenseCreationError(Exception):
    """Generic expense creation error"""
    pass

# class ExpenseSplitCreationError(Exception):
#     """When the ExpenseSplit relationship cant be made with an Expense"""
#     pass



class ExpenseNotFoundError(Exception):
    """Generic fallback"""
    pass

# ******************************************************************************************************************************************************************************************
# GROUPS
# ******************************************************************************************************************************************************************************************

class GroupCreationError(Exception):
    """When a group cant be created"""
    pass

class GroupJoinError(Exception):
    "When a group cant be joined"
    pass

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
# USERS
# ******************************************************************************************************************************************************************************************
