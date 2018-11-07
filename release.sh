#!/bin/bash

version=$1
tag=$2

versionAndTag = "version $version"
if [ -n "$tag" ] 
then
	versionAndTag = "version $version@$tag"
fi

echo
echo "Releasing anoa-cli $versionAndTag..."
echo

read -p "Are you sure want to release $versionAndTag? (y/n)" -n 1 -r
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

	if [ -n "$tag" ] 
	then
		npm publish --tag $tag
	else
		npm publish
	fi

	echo
	echo "Done! -- published to https://www.npmjs.com/package/anoa-cli"
fi