#!/bin/bash
echo "Creating env-config.js file"
# environment variables should be set in envConfig.sh   

sed 's|${WORKBENCH_PROTOCOL}|'$WORKBENCH_PROTOCOL'|g' $PWD/cw-config/cw-ui-template/env-config.js.template > $PWD/cw-config/cw-ui/env-config.js.1
sed 's|${WORKBENCH_HOST}|'$WORKBENCH_HOST'|g' $PWD/cw-config/cw-ui/env-config.js.1 > $PWD/cw-config/cw-ui/env-config.js.2
sed 's|${WORKBENCH_PORT}|'$WORKBENCH_PORT_EXTERNAL'|g' $PWD/cw-config/cw-ui/env-config.js.2 > $PWD/cw-config/cw-ui/env-config.js
rm $PWD/cw-config/cw-ui/env-config.js.1
rm $PWD/cw-config/cw-ui/env-config.js.2
