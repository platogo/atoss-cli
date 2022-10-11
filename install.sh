#!/usr/bin/env bash
set -euo pipefail

PWD=$(pwd)
LOCAL_JAR_PATH=$PWD/target/default+uberjar
LOCAL_JAR_NAME=atoss-cli-standalone.jar
LOCAL_JAR_FILE=$LOCAL_JAR_PATH/$LOCAL_JAR_NAME

if [ -z ${INSTALL_DIR+x} ]; then
  INSTALL_DIR=/usr/local/bin
fi

# Make a check that chromedriver and java are present
echo 'Checking requirements...'

if ! java -version >/dev/null; then
	echo "WARNING: Java is not installed or activated!"
fi

if ! chromedriver -v >/dev/null; then
	echo "WARNING: chromedriver is not installed or is missing from PATH!"
fi

echo "Installing ATOSS CLI..."

if [ -f "$LOCAL_JAR_FILE" ]; then
	echo "Local uberjar exists, skipping pull from remote."
	install "$LOCAL_JAR_FILE" "$INSTALL_DIR"
else
	echo "$LOCAL_JAR_FILE does not exist, pulling latest release from Github."
	mkdir -p "$LOCAL_JAR_PATH"
	curl -L https://github.com/platogo/atoss-cli/releases/latest/download/atoss-cli-standalone.jar > "$LOCAL_JAR_FILE"
	install "$LOCAL_JAR_FILE" $INSTALL_DIR
fi

echo "Installing wrapper..."

sed "s|INSTALL_DIR=.*|INSTALL_DIR=$INSTALL_DIR|" "$PWD/wrapper.sh" > "${INSTALL_DIR}/atoss-cli"
chmod 755 "$INSTALL_DIR/atoss-cli"

echo "Done! You can try running atoss-cli --version"
