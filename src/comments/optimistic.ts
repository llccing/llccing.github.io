import type { AnnotationThread, CommentReply } from "./protocol";

export function replaceOptimisticThread(
  threads: AnnotationThread[],
  temporaryId: string,
  saved: AnnotationThread
): AnnotationThread[] {
  return threads.map(thread => (thread.id === temporaryId ? saved : thread));
}

export function replaceOptimisticReply(
  threads: AnnotationThread[],
  temporaryId: string,
  saved: CommentReply & { annotationId: string }
): AnnotationThread[] {
  return threads.map(thread =>
    thread.id === saved.annotationId
      ? {
          ...thread,
          replies: thread.replies.map(reply =>
            reply.id === temporaryId ? saved : reply
          ),
        }
      : thread
  );
}

export function updateOptimisticBody(
  threads: AnnotationThread[],
  id: string,
  body: string
): AnnotationThread[] {
  return threads.map(thread => {
    if (thread.id === id) return { ...thread, bodyText: body };
    return {
      ...thread,
      replies: thread.replies.map(reply =>
        reply.id === id ? { ...reply, bodyText: body } : reply
      ),
    };
  });
}

export function removeOptimisticResource(
  threads: AnnotationThread[],
  id: string
): AnnotationThread[] {
  return threads
    .filter(thread => thread.id !== id)
    .map(thread => ({
      ...thread,
      replies: thread.replies.filter(reply => reply.id !== id),
    }));
}
