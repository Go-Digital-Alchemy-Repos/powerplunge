#!/usr/bin/env npx tsx
/**
 * Blog / Posts Smoke Tests
 *
 * Exercises the active CMS Posts system via direct service calls:
 *   - Admin: list, create, publish, unpublish, archive
 *   - Public: list published only, get by slug
 *
 * Run:  npx tsx scripts/smoke/blogSmoke.ts
 */

import { db } from "../../server/db";
import { posts } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { postsService } from "../../server/src/services/cms.posts.service";
import { publicBlogService } from "../../server/src/services/public.blog.service";

let pass = 0;
let fail = 0;
const created: string[] = [];

function assert(label: string, ok: boolean, detail?: string) {
  if (ok) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label}${detail ? " — " + detail : ""}`);
  }
}

async function cleanup() {
  for (const id of created) {
    try {
      await db.delete(posts).where(eq(posts.id, id));
    } catch {}
  }
}

async function main() {
  console.log("=== Blog / Posts Smoke Tests ===\n");

  // ── Admin: list posts ──
  console.log("[Admin] List posts");
  const initialList = await postsService.list({});
  assert("list() returns paginated result", Array.isArray(initialList.data));

  // ── Admin: create a draft post ──
  console.log("\n[Admin] Create draft post");
  const slug = `smoke-test-post-${Date.now()}`;
  let postId: string | null = null;
  try {
    const post = await postsService.create({
      title: "Smoke Test Post",
      slug,
      legacyHtml: "<p>Hello from smoke test</p>",
      contentJson: { root: { props: {} }, content: [] },
      excerpt: "Smoke excerpt",
      status: "draft",
    });
    postId = post?.id ?? null;
    if (post?.id) created.push(post.id);
    assert("create() returns post with id", !!post?.id);
    assert("create() status is draft", post?.status === "draft");
    assert("create() slug matches", post?.slug === slug);
  } catch (err: any) {
    assert("create() succeeded", false, err.message);
  }

  // ── Public: list published (should NOT include our draft) ──
  console.log("\n[Public] List published posts (draft should be hidden)");
  const pubListBefore = await publicBlogService.listPublished();
  assert("listPublished() returns paginated result", Array.isArray(pubListBefore.data));
  const draftInPublic = pubListBefore.data.find((p: any) => p.slug === slug);
  assert("draft post NOT in published list", !draftInPublic);

  // ── Public: get draft by slug (should fail) ──
  console.log("\n[Public] Get draft by slug (should return null)");
  const pubDraft = await publicBlogService.getPublishedBySlug(slug);
  assert("draft not accessible via getPublishedBySlug()", pubDraft === null || pubDraft === undefined);

  if (!postId) {
    console.log("\nSkipping publish/unpublish tests (create failed)\n");
    await cleanup();
    console.log(`\n=== Results: ${pass} passed, ${fail} failed ===`);
    process.exit(fail > 0 ? 1 : 0);
  }

  // ── Admin: publish the post ──
  console.log("\n[Admin] Publish post");
  try {
    const published = await postsService.publish(postId);
    assert("publish() returns post", !!published);
    assert("publish() status is published", published?.status === "published");
    assert("publish() sets publishedAt", !!published?.publishedAt);
  } catch (err: any) {
    assert("publish() succeeded", false, err.message);
  }

  // ── Public: now should appear in published list ──
  console.log("\n[Public] Published post now visible");
  const pubListAfter = await publicBlogService.listPublished();
  const pubPost = pubListAfter.data.find((p: any) => p.slug === slug);
  assert("published post appears in listPublished()", !!pubPost);

  // ── Public: get by slug ──
  console.log("\n[Public] Get published post by slug");
  const bySlug = await publicBlogService.getPublishedBySlug(slug);
  assert("getPublishedBySlug() returns post", !!bySlug);
  assert("getPublishedBySlug() title matches", bySlug?.title === "Smoke Test Post");

  // ── Admin: unpublish ──
  console.log("\n[Admin] Unpublish post");
  try {
    const unpub = await postsService.unpublish(postId);
    assert("unpublish() returns post", !!unpub);
    assert("unpublish() status is draft", unpub?.status === "draft");
  } catch (err: any) {
    assert("unpublish() succeeded", false, err.message);
  }

  // ── Public: unpublished no longer visible ──
  console.log("\n[Public] Unpublished post hidden again");
  const pubAfterUnpub = await publicBlogService.getPublishedBySlug(slug);
  assert("unpublished post not accessible", pubAfterUnpub === null || pubAfterUnpub === undefined);

  // ── Admin: delete ──
  console.log("\n[Admin] Archive post");
  try {
    const archived = await postsService.archive(postId);
    assert("archive() returns archived post", !!archived);
    assert("archive() status is archived", archived?.status === "archived");
  } catch (err: any) {
    assert("archive() succeeded", false, err.message);
  }

  // ── Cleanup hard-deletes the smoke row ──
  await cleanup();
  const afterCleanup = await postsService.getById(postId);
  assert("cleanup removed smoke post", !afterCleanup);
  created.splice(created.indexOf(postId), 1);

  console.log(`\n=== Results: ${pass} passed, ${fail} failed ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error("Blog smoke test error:", err);
  await cleanup();
  process.exit(1);
});
