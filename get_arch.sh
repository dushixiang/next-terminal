ARCH="$(arch)"
case "$ARCH" in
'x86_64')
	export ARCH='amd64'
	echo $ARCH
	;;
'aarch64')
	export ARCH='arm64'
	echo $ARCH
	;;
*)
	export ARCH=$ARCH
	echo $ARCH
	;;
esac
