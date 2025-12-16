#!/bin/bash
echo "Creating env-config.js file"
# environment variables should be set in envConfig.sh   

UI_TEMPLATE_DIR=$PWD/cw-config/cw-ui-template
UI_CONFIG_DIR=$PWD/cw-config/cw-ui

mkdir -p $UI_CONFIG_DIR
sed 's|${WORKBENCH_PROTOCOL}|'$WORKBENCH_PROTOCOL'|g' $UI_TEMPLATE_DIR/env-config.js.template > $UI_CONFIG_DIR/env-config.js.1
sed 's|${WORKBENCH_HOST}|'$WORKBENCH_HOST'|g' $UI_CONFIG_DIR/env-config.js.1 > $UI_CONFIG_DIR/env-config.js.2
sed 's|${WORKBENCH_PORT}|'$WORKBENCH_PORT_EXTERNAL'|g' $UI_CONFIG_DIR/env-config.js.2 > $UI_CONFIG_DIR/env-config.js
rm $PWD/cw-config/cw-ui/env-config.js.1
rm $PWD/cw-config/cw-ui/env-config.js.2
