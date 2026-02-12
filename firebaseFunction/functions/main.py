from firebase_functions.options import set_global_options

from remake import check_pending_tasks
from notifyOnNewActivities import notify_owner_on_activity_created

# Cost control for this codebase.
set_global_options(max_instances=10)
