#!/bin/bash
# clean-cache.sh
# 개발 환경을 위한 캐시 정리 및 앱 재시작 스크립트

# 사용법 표시
print_usage() {
  echo "Usage: ./clean-cache.sh [options]"
  echo "Options:"
  echo "  --all       캐시 및 노드 모듈을 포함한 모든 임시 파일 삭제"
  echo "  --cache     Next.js 및 Electron 빌드 캐시만 삭제"
  echo "  --nextjs    Next.js 캐시만 삭제 (cache 디렉토리 제외)"
  echo "  --rebuild   native 모듈 재빌드"
  echo "  --help      도움말 표시"
  echo ""
  echo "Example: ./clean-cache.sh --cache --rebuild"
}

# 인자가 없으면 도움말 표시
if [ $# -eq 0 ]; then
  print_usage
  exit 1
fi

# 경로 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"

# 명령줄 인자 파싱
clean_cache=false
clean_nextjs=false
clean_all=false
rebuild_native=false

for arg in "$@"; do
  case $arg in
    --all)
      clean_all=true
      ;;
    --cache)
      clean_cache=true
      ;;
    --nextjs)
      clean_nextjs=true
      ;;
    --rebuild)
      rebuild_native=true
      ;;
    --help)
      print_usage
      exit 0
      ;;
    *)
      echo "Unknown option: $arg"
      print_usage
      exit 1
      ;;
  esac
done

# 캐시 정리
if [ "$clean_cache" = true ]; then
  echo "🧹 Next.js 캐시 정리 중..."
  rm -rf "$ROOT_DIR/.next/!(cache)"
  rm -rf "$ROOT_DIR/dist"
  echo "✅ 캐시 정리 완료"
fi

# Next.js만 정리
if [ "$clean_nextjs" = true ]; then
  echo "🧹 Next.js 파일 정리 중..."
  find "$ROOT_DIR/.next" -mindepth 1 -not -name 'cache' -not -path '*/cache/*' -exec rm -rf {} + 2>/dev/null || true
  echo "✅ Next.js 정리 완료"
fi

# 전체 정리
if [ "$clean_all" = true ]; then
  echo "🧹 모든 임시 파일 정리 중..."
  rm -rf "$ROOT_DIR/.next"
  rm -rf "$ROOT_DIR/dist"
  rm -rf "$ROOT_DIR/node_modules/.cache"
  echo "✅ 전체 정리 완료"
fi

# 네이티브 모듈 재빌드
if [ "$rebuild_native" = true ]; then
  echo "🔨 네이티브 모듈 재빌드 중..."
  cd "$ROOT_DIR" && npm run rebuild
  echo "✅ 네이티브 모듈 재빌드 완료"
fi

echo "🚀 작업이 완료되었습니다."
