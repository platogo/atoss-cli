#!/usr/bin/env bash
set -euo pipefail

PWD=$(pwd)

echo "Installing ATOSS CLI..."

LOCAL_JAR_FILE=$PWD/target/default+uberjar/atoss-cli-standalone.jar
INSTALL_DIR=/usr/local/bin/

if [ -f "$LOCAL_JAR_FILE" ]; then
    echo "Local uberjar exists, skipping pull from remote."
	cp -f "$LOCAL_JAR_FILE" "$INSTALL_DIR"
else
    echo "$LOCAL_JAR_FILE does not exist, pulling release from Github."

	if $(gh --version); then
		# When Github CLI is installed
		rm -f atoss-cli-standalone.jar
		gh release download --pattern "*.jar"
		mv -f atoss-cli-standalone.jar $INSTALL_DIR
	else
		echo "Github CLI is not set up! Please visit http://cli.github.com/ for more details."
	fi

fi

echo "Installing wrapper"

cp -f $PWD/wrapper.sh "${INSTALL_DIR}atoss-cli"

# Make a check that chromedriver and java are present
echo 'Checking requirements...'

if ! $(java -version > /dev/null); then
	echo "WARNING: Java is not installed or activated!"
fi

if ! $(chromedriver -v > /dev/null); then
	echo "WARNING: chromedriver is not installed or is missing from PATH!"
fi
