#!/bin/bash

version=$1
tag=$2

echo
echo "Releasing anoa-cli version $version..."
echo

read -p "Are you sure want to release version $version? (y/n)" -n 1 -r
if [[ $REPLY =~ ^[Yy]$ ]]
then
	echo
  echo "Releasing $version now..."

	# build source code
	npm run build

	# stage all changes and commit
	git commit -am "v$version"

	# update npm version 
	# commit also tagged here
	npm version $version --message "Release version $version"

	# push to repo
	git push origin master --tags
	echo

	echo "Publishing to npm..."

	if [ -z "$tag" ] then
		npm publish
	else
		npm publish --tag $tag
	fi

	echo
	echo "Done! -- published to https://www.npmjs.com/package/anoa-cli"
fi