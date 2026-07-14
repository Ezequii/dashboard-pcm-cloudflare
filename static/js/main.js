'use strict';
init().catch(error=>{showPersistentError(error.message);showToast(error.message,true,6000);});
