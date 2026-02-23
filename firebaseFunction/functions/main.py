from firebase_functions.options import set_global_options

from psel_email_confirmation import send_psel_confirmation_email
from remake import scheduled_task

# Cost control for this codebase.
set_global_options(max_instances=10)
