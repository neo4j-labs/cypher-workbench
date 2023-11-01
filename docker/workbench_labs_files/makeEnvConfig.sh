#!/bin/bash
echo "Creating env-config.js file"
# environment variables should be set in envConfig.sh   

sed 's|${WORKBENCH_PROTOCOL}|'$WORKBENCH_PROTOCOL'|g' $PWD/sw-config/sw-ui-template/env-config.js.template > $PWD/sw-config/sw-ui/env-config.js.1
sed 's|${WORKBENCH_HOST}|'$WORKBENCH_HOST'|g' $PWD/sw-config/sw-ui/env-config.js.1 > $PWD/sw-config/sw-ui/env-config.js.2
sed 's|${WORKBENCH_PORT}|'$WORKBENCH_PORT_EXTERNAL'|g' $PWD/sw-config/sw-ui/env-config.js.2 > $PWD/sw-config/sw-ui/env-config.js
rm $PWD/sw-config/sw-ui/env-config.js.1
rm $PWD/sw-config/sw-ui/env-config.js.2
