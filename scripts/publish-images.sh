#!/bin/sh
set -eu

tag="${1:-latest}"

case "$tag" in
  *[!A-Za-z0-9._-]*)
    echo "Tag chỉ được chứa chữ, số, dấu chấm, gạch dưới hoặc gạch ngang." >&2
    exit 1
    ;;
esac

namespace="ldngduong"
export SEEV_IMAGE_TAG="$tag"

docker compose build crawler backend-app frontend

for image in seev-crawler seev-backend seev-frontend; do
  docker push "$namespace/$image:$tag"
  if [ "$tag" != "latest" ]; then
    docker tag "$namespace/$image:$tag" "$namespace/$image:latest"
    docker push "$namespace/$image:latest"
  fi
done

echo "Đã push Seev với tag $tag."
