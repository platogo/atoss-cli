#!/usr/bin/env bash
set -euo pipefail

PWD=$(pwd)
LOCAL_JAR_FILE=$PWD/target/default+uberjar/atoss-cli-standalone.jar
INSTALL_DIR=/usr/local/bin

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
	curl -L https://github.com/platogo/atoss-cli/releases/latest/download/atoss-cli-standalone.jar >atoss-cli-standalone.jar
	install atoss-cli-standalone.jar $INSTALL_DIR
fi

echo "Installing wrapper..."

cp -f "$PWD/wrapper.sh" "${INSTALL_DIR}/atoss-cli"

echo "Done! You can try running atoss-cli --version"
