import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import JSZip from 'jszip';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';

// Smallest valid PNG (1x1 transparent pixel).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

/** Builds a .akuko the way the creator app does. */
async function makeAkuko(slides: { text: string; image: boolean }[]) {
  const zip = new JSZip();
  const json = {
    title: 'Story',
    lan: 'en',
    type: 'basic',
    slides: slides.map((slide, i) => {
      if (!slide.image) return { text: slide.text };
      const name = `image_${String(i + 1).padStart(2, '0')}.png`;
      zip.file(`images/${name}`, PNG);
      return { text: slide.text, image: `/images/${name}` };
    }),
  };
  zip.file('index.json', JSON.stringify(json));
  return zip.generateAsync({ type: 'nodebuffer' });
}

type Fields = Record<string, string | number>;

describe('StoryTime API (e2e)', () => {
  let app: NestExpressApplication;
  let mediaRoot: string;
  let complete: Buffer;
  let superToken: string;
  let adminToken: string;
  let adminId: number;

  beforeAll(async () => {
    mediaRoot = mkdtempSync(join(tmpdir(), 'storytime-media-'));
    Object.assign(process.env, {
      DB_TYPE: 'sqlite',
      DB_NAME: ':memory:',
      MEDIA_ROOT: mediaRoot,
      JWT_SECRET: 'test-secret',
      PUBLIC_URL: '',
      LIBRETRANSLATE_URL: '',
      REVIEWER_CODE: 'REVIEW-CODE-42',
    });
    complete = await makeAkuko([
      { text: 'Once upon a time', image: true },
      { text: 'The end', image: true },
    ]);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(
      moduleRef.createNestApplication<NestExpressApplication>(),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    rmSync(mediaRoot, { recursive: true, force: true });
  });

  const http = () => request(app.getHttpServer());
  const path = (url: string) => new URL(url).pathname;
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  const login = async (email: string, password: string) =>
    (await http().post('/api/auth/login').send({ email, password }).expect(200))
      .body.token as string;

  const createBook = (token: string, fields: Fields, file = complete) => {
    const req = http()
      .post('/api/admin/books')
      .set(bearer(token))
      .attach('file', file, 'story.akuko');
    for (const [key, value] of Object.entries(fields))
      req.field(key, String(value));
    return req;
  };

  const updateBook = (
    token: string,
    id: number,
    fields: Fields,
    file?: Buffer,
  ) => {
    const req = http().patch(`/api/admin/books/${id}`).set(bearer(token));
    for (const [key, value] of Object.entries(fields))
      req.field(key, String(value));
    if (file) req.attach('file', file, 'story.akuko');
    return req;
  };

  const action = (token: string, id: number, name: string, body?: object) =>
    http().post(`/api/admin/books/${id}/${name}`).set(bearer(token)).send(body);

  const publicBooks = async () =>
    (await http().get('/api/books/?page=1&category=').expect(200)).body;

  it('serves the seeded categories and languages', async () => {
    const categories = await http().get('/api/categories/').expect(200);
    expect(categories.body).toHaveLength(7);
    const languages = await http().get('/api/languages/').expect(200);
    expect(languages.body).toHaveLength(24);
    expect(languages.body[1]).toEqual({ id: 2, name: 'Igbo', iso_code: 'ig' });
    expect(languages.body.at(-1)).toEqual({
      id: 24,
      name: 'Persian',
      iso_code: 'fa',
    });
  });

  it('creates the first super admin once, through setup', async () => {
    expect((await http().get('/api/auth/setup').expect(200)).body).toEqual({
      needed: true,
    });

    await http()
      .post('/api/auth/setup')
      .send({ name: 'Ada', email: 'Ada@Example.com', password: 'short' })
      .expect(400);
    const { body } = await http()
      .post('/api/auth/setup')
      .send({
        name: 'Ada',
        email: 'Ada@Example.com',
        password: 'super-secret-1',
      })
      .expect(201);
    expect(body.admin).toMatchObject({
      name: 'Ada',
      email: 'ada@example.com',
      role: 'super_admin',
    });
    superToken = body.token;

    expect((await http().get('/api/auth/setup').expect(200)).body).toEqual({
      needed: false,
    });
    await http()
      .post('/api/auth/setup')
      .send({
        name: 'Eve',
        email: 'eve@example.com',
        password: 'another-secret',
      })
      .expect(403);
  });

  it('signs in with email and password', async () => {
    await http()
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', password: 'wrong-password' })
      .expect(401);
    await http()
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'super-secret-1' })
      .expect(401);
    const token = await login('ADA@example.com', 'super-secret-1');
    const me = await http().get('/api/auth/me').set(bearer(token)).expect(200);
    expect(me.body.role).toBe('super_admin');

    await http().get('/api/admin/books').expect(401);
    await http().get('/api/admin/books').set(bearer('not-a-token')).expect(401);
  });

  it('lets super admins manage the team', async () => {
    const created = await http()
      .post('/api/admin/admins')
      .set(bearer(superToken))
      .send({ name: 'Bola', email: 'bola@example.com', role: 'creator' })
      .expect(201);
    expect(created.body.admin.role).toBe('creator');
    adminId = created.body.admin.id;
    adminToken = await login(
      'bola@example.com',
      created.body.temporary_password,
    );

    await http()
      .post('/api/admin/admins')
      .set(bearer(superToken))
      .send({ name: 'Bola again', email: 'bola@example.com', role: 'creator' })
      .expect(409);
    await http().get('/api/admin/admins').set(bearer(adminToken)).expect(403);

    const team = await http()
      .get('/api/admin/admins')
      .set(bearer(superToken))
      .expect(200);
    expect(team.body.map((a: { email: string }) => a.email)).toEqual([
      'ada@example.com',
      'bola@example.com',
    ]);

    // The last super admin can't be demoted or deactivated.
    const adaId = team.body[0].id;
    await http()
      .patch(`/api/admin/admins/${adaId}`)
      .set(bearer(superToken))
      .send({ role: 'admin' })
      .expect(400);

    // Deactivating cuts off existing sessions immediately.
    await http()
      .patch(`/api/admin/admins/${adminId}`)
      .set(bearer(superToken))
      .send({ active: false })
      .expect(200);
    await http().get('/api/auth/me').set(bearer(adminToken)).expect(401);
    await http()
      .patch(`/api/admin/admins/${adminId}`)
      .set(bearer(superToken))
      .send({ active: true })
      .expect(200);

    // So does a password reset.
    const reset = await http()
      .post(`/api/admin/admins/${adminId}/reset-password`)
      .set(bearer(superToken))
      .expect(200);
    await http().get('/api/auth/me').set(bearer(adminToken)).expect(401);
    adminToken = await login('bola@example.com', reset.body.temporary_password);

    const changed = await http()
      .post('/api/auth/password')
      .set(bearer(adminToken))
      .send({
        currentPassword: reset.body.temporary_password,
        password: 'bola-password-1',
      })
      .expect(200);
    adminToken = changed.body.token;
    await http().get('/api/auth/me').set(bearer(adminToken)).expect(200);
  });

  it('rejects files that are not .akuko archives', async () => {
    await createBook(
      adminToken,
      { title: 'A' },
      Buffer.from('not a zip'),
    ).expect(400);
    const noIndex = await new JSZip()
      .file('readme.txt', 'hi')
      .generateAsync({ type: 'nodebuffer' });
    const res = await createBook(adminToken, { title: 'A' }, noIndex).expect(
      400,
    );
    expect(res.body.message).toMatch(/index\.json/);
  });

  it('only shows creators their own books', async () => {
    const { body: book } = await createBook(superToken, {
      title: "Ada's draft",
    }).expect(201);
    await http()
      .get(`/api/admin/books/${book.id}`)
      .set(bearer(adminToken))
      .expect(404);
    const mine = await http()
      .get('/api/admin/books')
      .set(bearer(adminToken))
      .expect(200);
    expect(mine.body).toEqual([]);
    await http()
      .delete(`/api/admin/books/${book.id}`)
      .set(bearer(superToken))
      .expect(204);
  });

  it('publishes books only after a super admin approves them', async () => {
    const { body: draft } = await createBook(adminToken, {
      title: 'The Sleepy Owl',
      author: 'Bola',
      type: 'poem',
      level: 2,
    }).expect(201);
    expect(draft).toMatchObject({
      status: 'draft',
      owner: { id: adminId, name: 'Bola' },
      slide_count: 2,
      live: null,
    });

    const incomplete = await action(adminToken, draft.id, 'submit').expect(400);
    expect(incomplete.body.message).toMatch(/choose a category/);
    await updateBook(adminToken, draft.id, { category: 'Fables' }).expect(200);

    const submitted = await action(adminToken, draft.id, 'submit').expect(200);
    expect(submitted.body.status).toBe('in_review');
    expect(submitted.body.submitted_at).toBeTruthy();

    // Locked for its author while in review; only super admins decide.
    await updateBook(adminToken, draft.id, { title: 'Changed' }).expect(409);
    await action(adminToken, draft.id, 'approve').expect(403);

    await action(superToken, draft.id, 'reject', { note: '' }).expect(400);
    const rejected = await action(superToken, draft.id, 'reject', {
      note: 'Slide 2 needs a gentler ending.',
    }).expect(200);
    expect(rejected.body).toMatchObject({
      status: 'rejected',
      review_note: 'Slide 2 needs a gentler ending.',
      reviewed_by: { name: 'Ada' },
    });
    expect((await publicBooks()).count).toBe(0);

    const edited = await updateBook(adminToken, draft.id, { level: 3 }).expect(
      200,
    );
    expect(edited.body).toMatchObject({
      status: 'draft',
      review_note: 'Slide 2 needs a gentler ending.',
    });
    await action(adminToken, draft.id, 'submit').expect(200);

    const approved = await action(superToken, draft.id, 'approve').expect(200);
    expect(approved.body.status).toBe('approved');
    expect(approved.body.review_note).toBeNull();
    expect(approved.body.live.since).toBeTruthy();

    const live = await publicBooks();
    expect(live.count).toBe(1);
    expect(live.results[0]).toMatchObject({
      id: draft.id,
      title: 'The Sleepy Owl',
      category: 'Fables',
      level: 3,
    });
    expect(live.results[0].title_translations[0]).toEqual({
      language: 'English',
      lan: 'en',
      text: 'The Sleepy Owl',
    });
    await http().get(path(live.results[0].url)).expect(200);
    await http().get(path(live.results[0].thumbnail)).expect(200);
  });

  it('needs a narrator name on every recorded voice-over', async () => {
    // `ofBubble`: recorded the way a comic is, a bubble at a time.
    const narratedBy = async (narrator: string, ofBubble = false) => {
      const zip = await JSZip.loadAsync(complete);
      const index = JSON.parse(await zip.file('index.json')!.async('string'));
      index.narrations = [{ id: 'v1', lan: 'en', narrator }];
      const file = ofBubble ? 'slide_01_text_01.m4a' : 'slide_01.m4a';
      const audio = { v1: `/audio/v1/${file}` };
      if (ofBubble) index.slides[0].texts = [{ runs: 'Hello!', audio }];
      else index.slides[0].audio = audio;
      zip.file(`audio/v1/${file}`, Buffer.from('not really audio'));
      zip.file('index.json', JSON.stringify(index));
      return zip.generateAsync({ type: 'nodebuffer' });
    };

    const { body: book } = await createBook(
      adminToken,
      {
        title: 'Read To Me',
        author: 'Bola',
        type: 'basic',
        level: 1,
        category: 'Fables',
      },
      await narratedBy('  '),
    ).expect(201);
    const blocked = await action(adminToken, book.id, 'submit').expect(400);
    expect(blocked.body.message).toMatch(/narrator name/);

    // A comic's recordings are of its bubbles: they need a narrator as much.
    await updateBook(
      adminToken,
      book.id,
      {},
      await narratedBy('  ', true),
    ).expect(200);
    const stillBlocked = await action(adminToken, book.id, 'submit').expect(
      400,
    );
    expect(stillBlocked.body.message).toMatch(/narrator name/);

    await updateBook(adminToken, book.id, {}, await narratedBy('Ada')).expect(
      200,
    );
    await action(adminToken, book.id, 'submit').expect(200);

    // The studio offers every narrator so far in its narrator list.
    const narrators = await http()
      .get('/api/admin/narrators')
      .set(bearer(adminToken))
      .expect(200);
    expect(narrators.body).toEqual(['Ada']);

    // The next tests work on the admin's newest book.
    await http()
      .delete(`/api/admin/books/${book.id}`)
      .set(bearer(superToken))
      .expect(204);
  });

  it('needs every quiz question finished before it is submitted', async () => {
    const withQuiz = async (answer: number | null) => {
      const zip = await JSZip.loadAsync(complete);
      const index = JSON.parse(await zip.file('index.json')!.async('string'));
      index.quiz = [
        {
          question: 'Who could not sleep?',
          choices: ['Owl', 'Moon', 'Fox', 'Cat'],
          answer: 0,
        },
        {
          question: 'What was the moon?',
          choices: ['Round', 'Square', '', 'Blue'],
          answer,
        },
      ];
      index.languages = ['fr'];
      index.slides[0].translations = { fr: 'Le hibou ne dormait pas.' };
      zip.file('index.json', JSON.stringify(index));
      return zip.generateAsync({ type: 'nodebuffer' });
    };

    const { body: book } = await createBook(
      adminToken,
      {
        title: 'Quiz Me',
        author: 'Bola',
        type: 'poem',
        level: 2,
        category: 'Fables',
      },
      await withQuiz(null),
    ).expect(201);
    const blocked = await action(adminToken, book.id, 'submit').expect(400);
    expect(blocked.body.message).toMatch(/finish quiz question 2/);

    // Still unfinished with an answer ticked but one left blank.
    await updateBook(adminToken, book.id, {}, await withQuiz(1)).expect(200);
    await action(adminToken, book.id, 'submit').expect(400);

    const zip = await JSZip.loadAsync(await withQuiz(1));
    const index = JSON.parse(await zip.file('index.json')!.async('string'));
    index.quiz[1].choices[2] = 'Hot';
    zip.file('index.json', JSON.stringify(index));
    await updateBook(
      adminToken,
      book.id,
      {},
      await zip.generateAsync({ type: 'nodebuffer' }),
    ).expect(200);
    await action(adminToken, book.id, 'submit').expect(200);

    await http()
      .delete(`/api/admin/books/${book.id}`)
      .set(bearer(superToken))
      .expect(204);
  });

  it('says when machine translation is not set up', async () => {
    await http().get('/api/admin/translate').expect(401);
    const status = await http()
      .get('/api/admin/translate')
      .set(bearer(adminToken))
      .expect(200);
    expect(status.body).toEqual({ available: false });

    const refused = await http()
      .post('/api/admin/translate')
      .set(bearer(adminToken))
      .send({ source: 'en', target: 'fr', texts: ['The moon'] })
      .expect(503);
    expect(refused.body.message).toMatch(/type the translation in/);

    await http()
      .post('/api/admin/translate')
      .set(bearer(adminToken))
      .send({ source: 'english!', target: 'fr', texts: 'not a list' })
      .expect(400);
  });

  it('keeps the approved version live while changes wait for review', async () => {
    const [book] = (
      await http().get('/api/admin/books').set(bearer(adminToken)).expect(200)
    ).body;
    const before = (await publicBooks()).results[0];

    // With its title in French too, as the studio writes it.
    const zip = await JSZip.loadAsync(
      await makeAkuko([{ text: 'A brand new story', image: true }]),
    );
    const index = JSON.parse(await zip.file('index.json')!.async('string'));
    index.languages = ['fr'];
    index.titles = { fr: ' Le hibou bien éveillé ', es: '  ' };
    zip.file('index.json', JSON.stringify(index));
    const rewritten = await zip.generateAsync({ type: 'nodebuffer' });
    const { body: changed } = await updateBook(
      adminToken,
      book.id,
      { title: 'The Wide-Awake Owl' },
      rewritten,
    ).expect(200);
    expect(changed).toMatchObject({ status: 'draft', slide_count: 1 });
    expect(changed.live).toBeTruthy();

    // The app still gets the approved version.
    const during = (await publicBooks()).results[0];
    expect(during).toMatchObject({ title: 'The Sleepy Owl', slide_count: 2 });
    expect(path(during.url)).toBe(path(before.url));
    await http().get(path(before.url)).expect(200);

    // An admin can't take a live book down by deleting it.
    await http()
      .delete(`/api/admin/books/${book.id}`)
      .set(bearer(adminToken))
      .expect(403);

    await action(adminToken, book.id, 'submit').expect(200);
    await new Promise((r) => setTimeout(r, 1100)); // SQLite timestamps are per second
    await action(superToken, book.id, 'approve').expect(200);
    const after = (await publicBooks()).results[0];
    expect(after).toMatchObject({
      title: 'The Wide-Awake Owl',
      slide_count: 1,
    });
    // The creator's French title is used; Spanish has none, and no translation server.
    const titleIn = (lan: string) =>
      after.title_translations.find((t: { lan: string }) => t.lan === lan);
    expect(titleIn('fr')).toEqual({
      language: 'French',
      lan: 'fr',
      text: 'Le hibou bien éveillé',
    });
    expect(titleIn('es').text).toBe('');
    expect(path(after.url)).not.toBe(path(before.url));
    expect(after.created_at).toBe(before.created_at);
    expect(after.updated_at).not.toBe(before.updated_at);
    await http().get(path(before.url)).expect(404);
  });

  it('keeps a studio file beside the book, and out of the app', async () => {
    const zip = new JSZip();
    zip.file('index.json', JSON.stringify({ format: 1, pages: [] }));
    zip.file('pictures/a.png', PNG);
    const studio = await zip.generateAsync({ type: 'nodebuffer' });

    const { body: book } = await createBook(adminToken, {
      title: 'Panels',
      category: 'Adventure',
    }).expect(201);
    const studioUrl = `/api/admin/books/${book.id}/studio`;
    await http().get(studioUrl).set(bearer(adminToken)).expect(204);

    // It comes with a save, with or without the .akuko.
    await http()
      .patch(`/api/admin/books/${book.id}`)
      .set(bearer(adminToken))
      .attach('studio', Buffer.from('not a zip'), 'story.akukostudio')
      .expect(400);
    const { body: saved } = await http()
      .patch(`/api/admin/books/${book.id}`)
      .set(bearer(adminToken))
      .attach('file', complete, 'story.akuko')
      .attach('studio', studio, 'story.akukostudio')
      .expect(200);
    expect(saved.slide_count).toBe(2);
    const back = await http()
      .get(studioUrl)
      .set(bearer(adminToken))
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(Buffer.compare(back.body as Buffer, studio)).toBe(0);

    // Saving the book again without one leaves it as it was.
    await updateBook(
      adminToken,
      book.id,
      { title: 'Panels again' },
      complete,
    ).expect(200);
    await http().get(studioUrl).set(bearer(adminToken)).expect(200);

    // Only its owner (and super admins) can have it, and the app never does.
    await http().get(studioUrl).expect(401);
    await action(adminToken, book.id, 'submit').expect(200);
    await action(superToken, book.id, 'approve').expect(200);
    const live = (await publicBooks()).results.find(
      (b: { id: number }) => b.id === book.id,
    );
    const published = await JSZip.loadAsync(
      (
        await http()
          .get(path(live.url))
          .buffer(true)
          .parse((res, done) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => done(null, Buffer.concat(chunks)));
          })
          .expect(200)
      ).body as Buffer,
    );
    expect(Object.keys(published.files).sort()).toEqual([
      'images/',
      'images/image_01.png',
      'images/image_02.png',
      'index.json',
    ]);

    await http()
      .delete(`/api/admin/books/${book.id}`)
      .set(bearer(superToken))
      .expect(204);
  });

  it("keeps a book's thumbnail apart from its first slide's picture", async () => {
    const SQUARE = Buffer.from('a square picture');
    const fetched = async (url: string) =>
      (
        await http()
          .get(path(url))
          .buffer(true)
          .parse((res, done) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => done(null, Buffer.concat(chunks)));
          })
          .expect(200)
      ).body as Buffer;
    const zip = await JSZip.loadAsync(complete);
    const index = JSON.parse(await zip.file('index.json')!.async('string'));
    index.thumbnail = { file: '/thumbnail.jpg', own: true };
    zip.file('index.json', JSON.stringify(index));
    zip.file('thumbnail.jpg', SQUARE);
    const withThumbnail = await zip.generateAsync({ type: 'nodebuffer' });

    // A book that brings no thumbnail goes by its first slide's picture.
    const { body: book } = await createBook(adminToken, {
      title: 'Covers',
      category: 'Adventure',
    }).expect(201);
    expect(Buffer.compare(await fetched(book.thumbnail), PNG)).toBe(0);
    expect(Buffer.compare(await fetched(book.cover), PNG)).toBe(0);

    const { body: saved } = await updateBook(
      adminToken,
      book.id,
      {},
      withThumbnail,
    ).expect(200);
    expect(saved.thumbnail).toMatch(/\.jpg$/);
    expect(Buffer.compare(await fetched(saved.thumbnail), SQUARE)).toBe(0);
    expect(Buffer.compare(await fetched(saved.cover), PNG)).toBe(0);
    await http().get(path(book.thumbnail)).expect(404);
    await http().get(path(book.cover)).expect(404);

    // The app is given both: one for its library, one for while the book opens.
    await action(adminToken, book.id, 'submit').expect(200);
    await action(superToken, book.id, 'approve').expect(200);
    const live = (await publicBooks()).results.find(
      (b: { id: number }) => b.id === book.id,
    );
    expect(Buffer.compare(await fetched(live.thumbnail), SQUARE)).toBe(0);
    expect(Buffer.compare(await fetched(live.cover), PNG)).toBe(0);

    await http()
      .delete(`/api/admin/books/${book.id}`)
      .set(bearer(superToken))
      .expect(204);
    for (const url of [
      saved.thumbnail,
      saved.cover,
      live.thumbnail,
      live.cover,
    ]) {
      await http().get(path(url)).expect(404);
    }
  });

  it('lets super admins unpublish and delete', async () => {
    const [book] = (
      await http().get('/api/admin/books').set(bearer(adminToken)).expect(200)
    ).body;
    const live = (await publicBooks()).results[0];

    await action(adminToken, book.id, 'unpublish').expect(403);
    const unpublished = await action(superToken, book.id, 'unpublish').expect(
      200,
    );
    expect(unpublished.body).toMatchObject({ status: 'draft', live: null });
    expect((await publicBooks()).count).toBe(0);
    await http().get(path(live.url)).expect(404);

    await http()
      .delete(`/api/admin/books/${book.id}`)
      .set(bearer(adminToken))
      .expect(204);
    await http().get(path(book.url)).expect(404);
  });

  it('lets admins moderate books, but not run the team, the app or the money', async () => {
    const created = await http()
      .post('/api/admin/admins')
      .set(bearer(superToken))
      .send({ name: 'Cleo', email: 'cleo@example.com', role: 'admin' })
      .expect(201);
    const moderator = await login(
      'cleo@example.com',
      created.body.temporary_password,
    );

    const { body: book } = await createBook(adminToken, {
      title: 'The Patient Tortoise',
      category: 'Fables',
    }).expect(201);
    // A creator's draft is there for moderators to see, not to delete.
    const all = await http()
      .get('/api/admin/books')
      .set(bearer(moderator))
      .expect(200);
    expect(all.body.map((b: { id: number }) => b.id)).toContain(book.id);
    await http()
      .delete(`/api/admin/books/${book.id}`)
      .set(bearer(moderator))
      .expect(403);

    await action(adminToken, book.id, 'submit').expect(200);
    await action(adminToken, book.id, 'approve').expect(403);
    const approved = await action(moderator, book.id, 'approve').expect(200);
    expect(approved.body).toMatchObject({
      status: 'approved',
      reviewed_by: { name: 'Cleo' },
    });
    await action(moderator, book.id, 'unpublish').expect(200);

    for (const path of [
      '/api/admin/admins',
      '/api/admin/backgrounds',
      '/api/admin/music',
    ]) {
      await http().get(path).set(bearer(moderator)).expect(403);
    }
    await http()
      .put('/api/admin/analytics/creator-share')
      .set(bearer(moderator))
      .send({ percent: 90 })
      .expect(403);
    // Admins can't make themselves super admins either.
    await http()
      .patch(`/api/admin/admins/${created.body.admin.id}`)
      .set(bearer(moderator))
      .send({ role: 'super_admin' })
      .expect(403);

    await http()
      .delete(`/api/admin/books/${book.id}`)
      .set(bearer(adminToken))
      .expect(204);
    await http()
      .patch(`/api/admin/admins/${created.body.admin.id}`)
      .set(bearer(superToken))
      .send({ active: false })
      .expect(200);
  });

  it('lets people apply to become creators, and admins decide', async () => {
    const terms = await http()
      .get('/api/creator-applications/terms')
      .expect(200);
    expect(terms.body).toEqual({ creator_share: 0.6 });

    const application = {
      name: 'Dayo',
      email: 'Dayo@Example.com',
      password: 'dayo-password-1',
      about: 'I write bedtime poems for my nieces, mostly about the sea.',
      links: 'https://example.com/dayo',
      kinds: ['poem', 'story'],
      languages: 'English, Yoruba',
      country: 'Nigeria',
    };
    const apply = (body: object) =>
      http().post('/api/creator-applications').send(body);
    await apply({ ...application, about: 'Hi' }).expect(400);
    await apply({ ...application, kinds: [] }).expect(400);
    await apply({ ...application, kinds: ['novel'] }).expect(400);
    await apply({ ...application, password: 'short' }).expect(400);
    // Someone with an account signs in instead.
    await apply({ ...application, email: 'bola@example.com' }).expect(409);

    expect((await apply(application).expect(201)).body).toEqual({
      status: 'pending',
    });
    await apply(application).expect(409);

    // Until it's approved, signing in says so; a wrong password says only that.
    const pending = await http()
      .post('/api/auth/login')
      .send({ email: 'dayo@example.com', password: 'dayo-password-1' })
      .expect(403);
    expect(pending.body.message).toMatch(/still being reviewed/);
    await http()
      .post('/api/auth/login')
      .send({ email: 'dayo@example.com', password: 'wrong-password' })
      .expect(401);

    // A bot that fills in the hidden field is thanked, and nothing is kept.
    await apply({
      ...application,
      email: 'bot@example.com',
      website: 'http://spam.example',
    }).expect(201);

    const list = (token: string, status = 'pending') =>
      http()
        .get(`/api/admin/creator-applications?status=${status}`)
        .set(bearer(token));
    await list(adminToken).expect(403);
    await http().get('/api/admin/creator-applications').expect(401);
    const { body: waiting } = await list(superToken).expect(200);
    expect(waiting).toEqual([
      expect.objectContaining({
        name: 'Dayo',
        email: 'dayo@example.com',
        kinds: ['poem', 'story'],
        languages: 'English, Yoruba',
        country: 'Nigeria',
        status: 'pending',
      }),
    ]);
    expect(JSON.stringify(waiting)).not.toMatch(/scrypt|password/);

    const decide = (id: number, what: string, body?: object) =>
      http()
        .post(`/api/admin/creator-applications/${id}/${what}`)
        .set(bearer(superToken))
        .send(body);
    const { body: approved } = await decide(waiting[0].id, 'approve').expect(
      200,
    );
    expect(approved).toMatchObject({
      status: 'approved',
      reviewed_by: { name: 'Ada' },
    });
    await decide(waiting[0].id, 'decline').expect(409);

    // They sign in with the password they chose, as a creator.
    const dayo = await login('dayo@example.com', 'dayo-password-1');
    const me = await http().get('/api/auth/me').set(bearer(dayo)).expect(200);
    expect(me.body).toMatchObject({ id: approved.account_id, role: 'creator' });
    await apply(application).expect(409);

    // A declined applicant hears why when they try to sign in, and may apply again.
    const eme = { ...application, name: 'Eme', email: 'eme@example.com' };
    await apply(eme).expect(201);
    const [waitingEme] = (await list(superToken).expect(200)).body;
    await decide(waitingEme.id, 'decline', {
      note: 'We need a sample of your writing.',
    }).expect(200);
    const declined = await http()
      .post('/api/auth/login')
      .send({ email: 'eme@example.com', password: 'dayo-password-1' })
      .expect(403);
    expect(declined.body.message).toMatch(/wasn't accepted/);
    expect(declined.body.message).toMatch(/sample of your writing/);
    expect((await list(superToken, 'declined').expect(200)).body).toHaveLength(
      1,
    );
    await apply(eme).expect(201);

    await http()
      .patch(`/api/admin/admins/${approved.account_id}`)
      .set(bearer(superToken))
      .send({ active: false })
      .expect(200);
  });

  it('paginates published books like DRF', async () => {
    for (let i = 1; i <= 11; i++) {
      const { body } = await createBook(superToken, {
        title: `Dragon ${i}`,
        category: 'Fantasy',
      }).expect(201);
      await action(superToken, body.id, 'approve').expect(200);
    }

    const first = await http().get('/api/books/?page=1&category=').expect(200);
    expect(first.body.count).toBe(11);
    expect(first.body.results).toHaveLength(10);
    expect(first.body.next).toMatch(/\/api\/books\/\?page=2&category=$/);

    const second = await http().get('/api/books/?page=2').expect(200);
    expect(second.body.results).toHaveLength(1);
    expect(second.body.next).toBeNull();
    await http().get('/api/books/?page=3').expect(404);

    const fables = await http()
      .get('/api/books/?page=1&category=Fables')
      .expect(200);
    expect(fables.body.count).toBe(0);
  });

  it('filters published books by type (story or poem)', async () => {
    const { body: poem } = await createBook(superToken, {
      title: 'Twinkle Rhyme',
      type: 'poem',
      category: 'Humor',
    }).expect(201);
    await action(superToken, poem.id, 'approve').expect(200);

    const poems = await http().get('/api/books/?page=1&type=poem').expect(200);
    expect(poems.body.results.map((b: { title: string }) => b.title)).toEqual([
      'Twinkle Rhyme',
    ]);
    expect(poems.body.results[0].type).toBe('poem');

    const stories = await http()
      .get('/api/books/?page=1&type=basic&page_size=100')
      .expect(200);
    expect(
      stories.body.results.every((b: { type: string }) => b.type === 'basic'),
    ).toBe(true);
    expect(stories.body.count).toBe(11);

    await http().get('/api/books/?type=novel').expect(400);
  });

  it('hides spooky books unless asked, and filters by reading level', async () => {
    const { body: ghost } = await createBook(superToken, {
      title: 'The Friendly Ghost',
      category: 'Fantasy',
      level: 4,
      mood: 'spooky',
    }).expect(201);
    expect(ghost).toMatchObject({ level: 4, mood: 'spooky' });
    await action(superToken, ghost.id, 'approve').expect(200);

    const titles = (res: { body: { results: { title: string }[] } }) =>
      res.body.results.map((b) => b.title);
    const usual = await http()
      .get('/api/books/?page=1&page_size=100')
      .expect(200);
    expect(titles(usual)).not.toContain('The Friendly Ghost');
    expect(
      usual.body.results.every((b: { mood: string }) => b.mood !== 'spooky'),
    ).toBe(true);

    const allowed = await http()
      .get('/api/books/?page=1&page_size=100&spooky=1')
      .expect(200);
    expect(titles(allowed)).toContain('The Friendly Ghost');
    expect(allowed.body.count).toBe(usual.body.count + 1);

    const site = await http().get('/api/books-all').expect(200);
    expect(site.body.map((b: { title: string }) => b.title)).not.toContain(
      'The Friendly Ghost',
    );

    const levelFour = await http()
      .get('/api/books/?page=1&level=4&spooky=1')
      .expect(200);
    expect(titles(levelFour)).toEqual(['The Friendly Ghost']);
    await http().get('/api/books/?level=6').expect(400);

    await createBook(superToken, { title: 'Too Hard', level: 6 }).expect(400);
    await createBook(superToken, { title: 'Too Scary', mood: 'horror' }).expect(
      400,
    );
  });

  it('hides action books unless asked, separately from spooky ones', async () => {
    const { body: knight } = await createBook(superToken, {
      title: 'The Dragon Knight',
      category: 'Adventure',
      level: 5,
      mood: 'action',
    }).expect(201);
    await action(superToken, knight.id, 'approve').expect(200);

    const titles = async (query: string) =>
      (
        await http().get(`/api/books/?page=1&page_size=100${query}`).expect(200)
      ).body.results.map((b: { title: string }) => b.title);
    expect(await titles('')).not.toContain('The Dragon Knight');
    // Allowing spooky books doesn't allow action ones, and the other way round.
    expect(await titles('&spooky=1')).not.toContain('The Dragon Knight');
    expect(await titles('&action=1')).toContain('The Dragon Knight');
    expect(await titles('&action=1')).not.toContain('The Friendly Ghost');
    expect(await titles('&action=1&spooky=1')).toEqual(
      expect.arrayContaining(['The Dragon Knight', 'The Friendly Ghost']),
    );

    const site = await http().get('/api/books-all').expect(200);
    expect(site.body.map((b: { title: string }) => b.title)).not.toContain(
      'The Dragon Knight',
    );
  });

  it('opens one book to everyone: the newest story, which leads its shelf', async () => {
    type Listed = { id: number; title: string; free: boolean };
    const list = async (query: string) =>
      (await http().get(`/api/books/?${query}`).expect(200)).body
        .results as Listed[];
    const titles = (books: Listed[]) => books.map((b) => b.title);
    const free = (books: Listed[]) => titles(books.filter((b) => b.free));

    // Not the spooky or the action story, though they went live later: nobody
    // is shown those unasked.
    expect(free(await list('page_size=100&spooky=1&action=1'))).toEqual([
      'Dragon 11',
    ]);
    expect(free(await list('page_size=100&type=poem'))).toEqual([]);

    // It comes first wherever it's listed, the rest after it from the newest
    // (the poem went live after the dragons), and the pages still add up.
    expect(titles(await list('page_size=3'))).toEqual([
      'Dragon 11',
      'Twinkle Rhyme',
      'Dragon 10',
    ]);
    expect(titles(await list('page_size=3&page=2'))).toEqual([
      'Dragon 9',
      'Dragon 8',
      'Dragon 7',
    ]);
    // With the 7+ stories a parent has allowed, the newest are those: still under the free one.
    expect(
      titles(await list('page_size=3&type=basic&spooky=1&action=1')),
    ).toEqual(['Dragon 11', 'The Dragon Knight', 'The Friendly Ghost']);
    const all = await list('page_size=100');
    expect(all).toHaveLength(12);
    expect(new Set(all.map((b) => b.id)).size).toBe(12);
    expect(titles(all).at(-1)).toBe('Dragon 1');
    expect(titles(await list('type=basic&category=Fantasy'))[0]).toBe(
      'Dragon 11',
    );
    expect(titles(await list('page_size=1'))).toEqual(['Dragon 11']);

    // A newer poem doesn't take its place; a newer story does.
    const publish = async (fields: Fields) => {
      const { body } = await createBook(superToken, fields).expect(201);
      await action(superToken, body.id, 'approve').expect(200);
      return body.id as number;
    };
    await publish({ title: 'Later Rhyme', type: 'poem', category: 'Humor' });
    expect(free(await list('page_size=100'))).toEqual(['Dragon 11']);
    const newest = await publish({ title: 'Newest Story', category: 'Fables' });
    expect(free(await list('page_size=100'))).toEqual(['Newest Story']);
    expect(titles(await list('type=basic'))[0]).toBe('Newest Story');
    expect(
      (await http().get(`/api/books/${newest}`).expect(200)).body.free,
    ).toBe(true);
    const site = (await http().get('/api/books-all').expect(200))
      .body as Listed[];
    expect(free(site)).toEqual(['Newest Story']);

    // Taken down, it hands the place back.
    await action(superToken, newest, 'unpublish').expect(200);
    expect(free(await list('page_size=100'))).toEqual(['Dragon 11']);
  });

  it("follows what subscribers read, and shares a month's money among the books", async () => {
    const publish = async (token: string, title: string) => {
      const { body } = await createBook(token, {
        title,
        category: 'Fables',
      }).expect(201);
      if (token !== superToken) {
        await action(token, body.id, 'submit').expect(200);
      }
      await action(superToken, body.id, 'approve').expect(200);
      return body.id as number;
    };
    const creators = await publish(adminToken, 'Creator Book');
    const house = await publish(superToken, 'House Book');

    // Last month, so that it can be closed.
    const then = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
    const month = then.toISOString().slice(0, 7);
    const [ann, ben, visitor] = [randomUUID(), randomUUID(), randomUUID()];
    // A sitting with a two-page book.
    const sitting = (
      book_id: number,
      pages_read: number,
      subscribed = true,
    ) => ({
      id: randomUUID(),
      book_id,
      started_at: then.toISOString(),
      seconds: 120,
      pages_read,
      page_count: 2,
      completed: pages_read === 2,
      mode: 'read',
      subscribed,
    });
    const send = (reader_id: string, sessions: object[]) =>
      http().post('/api/analytics/sessions').send({ reader_id, sessions });
    const report = async (token: string, query = `?month=${month}`) =>
      (
        await http()
          .get(`/api/admin/analytics${query}`)
          .set(bearer(token))
          .expect(200)
      ).body;
    type Line = { id: number; title: string };
    const line = (of: { books: Line[] }, id: number) =>
      of.books.find((book) => book.id === id);

    await http()
      .post('/api/analytics/hello')
      .send({ reader_id: 'not-an-id', subscribed: true })
      .expect(400);
    await http()
      .post('/api/analytics/hello')
      .send({
        reader_id: ann,
        subscribed: true,
        plan: 'monthly',
        purchase_token: 'token-from-play',
      })
      .expect(204);

    // Ann reads the creator's book through and half of the house's...
    const anns = [sitting(creators, 2), sitting(house, 1)];
    expect((await send(ann, anns).expect(200)).body).toEqual({ accepted: 2 });
    // ...which, sent again, isn't counted again; nor is a book there isn't.
    expect(
      (await send(ann, [...anns, sitting(987654, 2)]).expect(200)).body,
    ).toEqual({ accepted: 0 });
    // Ben reads the house's twice. A visitor without a subscription reads the creator's.
    await send(ben, [sitting(house, 2), sitting(house, 2)]).expect(200);
    await send(visitor, [sitting(creators, 2, false)]).expect(200);
    await send(ben, [{ ...sitting(house, 2), seconds: -1 }]).expect(400);

    await http().get(`/api/admin/analytics?month=${month}`).expect(401);
    await http()
      .get('/api/admin/analytics?month=October')
      .set(bearer(superToken))
      .expect(400);

    // Before the month's money is known there are shares, and no amounts.
    const before = await report(superToken);
    expect(before).toMatchObject({
      month,
      scope: 'all',
      revenue: null,
      closed_at: null,
      split: { creator: 0.6, platform: 0.4 },
    });
    expect(before.totals).toMatchObject({
      subscribers_seen: 2,
      subscribers_reading: 2,
      other_readers: 1,
      amount: null,
    });
    expect(line(before, house)).toMatchObject({ amount: null });

    // Only a super admin enters it.
    const revenue = (token: string, body: object) =>
      http().put('/api/admin/analytics/revenue').set(bearer(token)).send(body);
    await revenue(adminToken, { month, amount: 1000, currency: 'NGN' }).expect(
      403,
    );
    await revenue(superToken, { month, amount: -5, currency: 'NGN' }).expect(
      400,
    );
    await revenue(superToken, {
      month,
      amount: 1000,
      currency: 'naira',
    }).expect(400);
    const { body: entered } = await revenue(superToken, {
      month,
      amount: 1000,
      currency: 'ngn',
    }).expect(200);
    expect(entered).toMatchObject({ revenue: 1000, currency: 'NGN' });
    expect(entered.totals).toMatchObject({
      per_subscriber: 500,
      amount: 1000,
      creator_amount: 600,
      platform_amount: 400,
    });
    // Ann's 500 × 1/1.5 to the creator's book; the rest of hers and all of Ben's to the house's.
    expect(line(entered, creators)).toMatchObject({
      title: 'Creator Book',
      creator: { id: adminId, name: 'Bola' },
      readers: 1,
      finished: 1,
      other_views: 1,
      amount: 333.33,
      creator_amount: 200,
      platform_amount: 133.33,
    });
    expect(line(entered, house)).toMatchObject({
      creator: { name: 'Ada' },
      readers: 2,
      reads: 2.5,
      amount: 666.67,
      creator_amount: 400,
    });
    expect(entered.creators.map((c: { name: string }) => c.name)).toEqual([
      'Ada',
      'Bola',
    ]);

    // A creator sees their own books, and not the month's money or anyone else's.
    const mine = await report(adminToken);
    expect(mine).toMatchObject({
      scope: 'own',
      revenue: null,
      currency: 'NGN',
    });
    expect(mine.books.map((book: Line) => book.title)).toEqual([
      'Creator Book',
    ]);
    expect(mine.creators).toHaveLength(1);
    expect(mine.totals).toMatchObject({
      subscribers_seen: null,
      subscribers_reading: 1,
      amount: 333.33,
      creator_amount: 200,
    });
    const { body: months } = await http()
      .get('/api/admin/analytics/months')
      .set(bearer(adminToken))
      .expect(200);
    expect(months).toEqual([new Date().toISOString().slice(0, 7), month]);

    // Closing a month fixes its figures.
    const close = (token: string, which: string, what = 'close') =>
      http().post(`/api/admin/analytics/${which}/${what}`).set(bearer(token));
    await close(adminToken, month).expect(403);
    await close(superToken, months[0]).expect(400);
    await close(superToken, 'last-month').expect(400);
    const { body: closed } = await close(superToken, month).expect(200);
    expect(closed.closed_at).toBeTruthy();
    expect(line(closed, creators)).toMatchObject({ amount: 333.33 });
    await close(superToken, month).expect(409);
    await revenue(superToken, { month, amount: 2000, currency: 'NGN' }).expect(
      409,
    );

    // Reading that's reported afterwards doesn't move them...
    await send(ben, [sitting(creators, 2)]).expect(200);
    const after = await report(superToken);
    expect(line(after, creators)).toMatchObject({ readers: 1, amount: 333.33 });
    expect((await report(adminToken)).totals.creator_amount).toBe(200);

    // ...until the month is reopened, and worked out afresh: now Ben's 500
    // is a third the creator's book's too.
    const { body: reopened } = await close(superToken, month, 'reopen').expect(
      200,
    );
    expect(reopened.closed_at).toBeNull();
    expect(line(reopened, creators)).toMatchObject({ readers: 2, amount: 500 });
    expect(line(reopened, house)).toMatchObject({ amount: 500 });
    await close(superToken, month, 'reopen').expect(409);

    // The creator share is the super admin's to set. It applies to every
    // month that isn't closed, and a closed month keeps the one it had.
    const share = (token: string, percent: unknown) =>
      http()
        .put('/api/admin/analytics/creator-share')
        .set(bearer(token))
        .send({ percent });
    await share(adminToken, 70).expect(403);
    await share(superToken, 101).expect(400);
    await share(superToken, 62.5).expect(400);
    expect((await share(superToken, 70).expect(200)).body).toMatchObject({
      creator_share: 0.7,
      updated_by: 'Ada',
    });
    const at70 = await report(superToken);
    expect(at70.split).toEqual({ creator: 0.7, platform: 0.3 });
    expect(line(at70, creators)).toMatchObject({
      amount: 500,
      creator_amount: 350,
      platform_amount: 150,
    });
    expect((await report(adminToken)).totals.creator_amount).toBe(350);
    expect(
      (await http().get('/api/creator-applications/terms').expect(200)).body,
    ).toEqual({ creator_share: 0.7 });

    await close(superToken, month).expect(200);
    await share(superToken, 60).expect(200);
    const kept = await report(superToken);
    expect(kept.split).toEqual({ creator: 0.7, platform: 0.3 });
    expect(line(kept, creators)).toMatchObject({ creator_amount: 350 });
    const { body: open } = await close(superToken, month, 'reopen').expect(200);
    expect(open.split).toEqual({ creator: 0.6, platform: 0.4 });
    expect(line(open, creators)).toMatchObject({ creator_amount: 300 });

    // This month's, when none is named: nothing read yet.
    expect((await report(superToken, '')).books).toEqual([]);
  });

  it("lets only super admins replace the app's backgrounds", async () => {
    const put = (token: string, slot: string, data: Buffer, name: string) =>
      http()
        .put(`/api/admin/backgrounds/${slot}`)
        .set(bearer(token))
        .attach('image', data, name);

    expect((await http().get('/api/backgrounds/').expect(200)).body).toEqual(
      {},
    );
    await put(adminToken, 'menu', PNG, 'menu.png').expect(403);
    await http()
      .get('/api/admin/backgrounds')
      .set(bearer(adminToken))
      .expect(403);
    await http().put('/api/admin/backgrounds/menu').expect(401);
    await put(superToken, 'lobby', PNG, 'menu.png').expect(400);
    await put(
      superToken,
      'menu',
      Buffer.from('not a picture'),
      'menu.png',
    ).expect(400);

    const first = (await put(superToken, 'menu', PNG, 'menu.png').expect(200))
      .body.menu;
    expect(first.url).toMatch(/\/media\/backgrounds\/[\w-]+\.png$/);
    await http().get(path(first.url)).expect(200);

    // A new picture gets a new URL, so the app knows to download it; the old one goes.
    const second = (await put(superToken, 'menu', PNG, 'menu.png').expect(200))
      .body.menu;
    expect(second.url).not.toBe(first.url);
    await http().get(path(first.url)).expect(404);
    expect(
      Object.keys((await http().get('/api/backgrounds').expect(200)).body),
    ).toEqual(['menu']);

    await http()
      .delete('/api/admin/backgrounds/menu')
      .set(bearer(adminToken))
      .expect(403);
    expect(
      (
        await http()
          .delete('/api/admin/backgrounds/menu')
          .set(bearer(superToken))
          .expect(200)
      ).body,
    ).toEqual({});
    await http().get(path(second.url)).expect(404);
  });

  it("lets only super admins change the app's music", async () => {
    // An MP3 starts with an ID3 tag or a frame header; the rest isn't checked.
    const MP3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(64)]);
    const OGG = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(64)]);
    const add = (token: string, name: string, data: Buffer) =>
      http()
        .post('/api/admin/music')
        .set(bearer(token))
        .field('name', name)
        .attach('file', data, 'track.mp3');
    const names = (list: { name: string }[]) => list.map((t) => t.name);

    expect((await http().get('/api/music/').expect(200)).body).toEqual([]);
    await add(adminToken, 'Moonlight', MP3).expect(403);
    await http().get('/api/admin/music').set(bearer(adminToken)).expect(403);
    await add(superToken, 'Moonlight', Buffer.from('not a sound')).expect(400);
    await add(superToken, '  ', MP3).expect(400);

    await add(superToken, 'Moonlight', MP3).expect(201);
    const list = (await add(superToken, 'Rain', OGG).expect(201)).body;
    expect(names(list)).toEqual(['Moonlight', 'Rain']);
    expect(list[1].url).toMatch(/\/media\/music\/[\w-]+\.ogg$/);
    await http().get(path(list[0].url)).expect(200);

    const [moon, rain] = list as { id: number; url: string }[];
    await http()
      .put('/api/admin/music/order')
      .set(bearer(superToken))
      .send({ ids: [moon.id] })
      .expect(400);
    await http()
      .put('/api/admin/music/order')
      .set(bearer(superToken))
      .send({ ids: [rain.id, moon.id] })
      .expect(200);
    await http()
      .patch(`/api/admin/music/${rain.id}`)
      .set(bearer(superToken))
      .send({ name: 'Soft rain' })
      .expect(200);
    expect(names((await http().get('/api/music').expect(200)).body)).toEqual([
      'Soft rain',
      'Moonlight',
    ]);

    await http()
      .delete(`/api/admin/music/${rain.id}`)
      .set(bearer(adminToken))
      .expect(403);
    const left = (
      await http()
        .delete(`/api/admin/music/${rain.id}`)
        .set(bearer(superToken))
        .expect(200)
    ).body;
    expect(names(left)).toEqual(['Moonlight']);
    await http().get(path(rain.url)).expect(404);

    // A new track goes to the end.
    expect(
      names((await add(superToken, 'Stars', MP3).expect(201)).body),
    ).toEqual(['Moonlight', 'Stars']);
  });

  it('tells the app the versions a super admin set, without the app check', async () => {
    const versions = () => http().get('/api/app-version').expect(200);
    expect((await versions()).body).toEqual({
      min_version: null,
      latest_version: null,
    });

    const set = (token: string, body: object) =>
      http().put('/api/admin/app-version').set(bearer(token)).send(body);
    await set(adminToken, { min_version: '1.2.0' }).expect(403);
    await http()
      .get('/api/admin/app-version')
      .set(bearer(adminToken))
      .expect(403);
    await set(superToken, { min_version: 'v1.2' }).expect(400);
    await set(superToken, {
      min_version: '1.4',
      latest_version: '1.3.9',
    }).expect(400);

    expect(
      (
        await set(superToken, {
          min_version: ' 1.2.0 ',
          latest_version: '1.4.1',
        }).expect(200)
      ).body,
    ).toMatchObject({
      min_version: '1.2.0',
      latest_version: '1.4.1',
      updated_by: 'Ada',
    });
    expect((await versions()).body).toEqual({
      min_version: '1.2.0',
      latest_version: '1.4.1',
    });

    // A blank box clears a version.
    await set(superToken, { min_version: '', latest_version: '1.4.1' }).expect(
      200,
    );
    expect((await versions()).body).toEqual({
      min_version: null,
      latest_version: '1.4.1',
    });
    expect(
      (
        await http()
          .get('/api/admin/app-version')
          .set(bearer(superToken))
          .expect(200)
      ).body,
    ).toMatchObject({ min_version: null, latest_version: '1.4.1' });
  });

  it('serves the terms and privacy pages', async () => {
    await http().get('/terms').expect(200).expect('Content-Type', /html/);
    await http().get('/privacy').expect(200).expect('Content-Type', /html/);
  });

  it("lets Play's reviewers in with the reviewer code, however it's typed", async () => {
    await http()
      .post('/api/reviewer-access')
      .send({ code: ' review-code-42 ' })
      .expect(204);
    await http()
      .post('/api/reviewer-access')
      .send({ code: 'REVIEW-CODE-41' })
      .expect(403);
    await http().post('/api/reviewer-access').send({}).expect(400);
  });

  it('gives every creator a code that opens their own books in the app', async () => {
    await http().get('/api/admin/unlock-code').expect(401);
    const { body: mine } = await http()
      .get('/api/admin/unlock-code')
      .set(bearer(adminToken))
      .expect(200);
    expect(mine.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(mine.live_books).toEqual(expect.any(Number));
    // The same code every time it's looked at.
    expect(
      (
        await http()
          .get('/api/admin/unlock-code')
          .set(bearer(adminToken))
          .expect(200)
      ).body.code,
    ).toBe(mine.code);

    const redeem = (code: string) =>
      http().post('/api/unlock-codes').send({ code });
    // Typed any old way on a tablet.
    const typed = ` ${mine.code.replace('-', ' ').toLowerCase()} `;
    expect((await redeem(typed).expect(200)).body).toEqual({
      all: false,
      creator: { id: adminId, name: 'Bola' },
    });
    expect((await redeem('review-code-42').expect(200)).body).toEqual({
      all: true,
      creator: null,
    });
    await redeem('ABCD-EFGH').expect(403);
    await http().post('/api/unlock-codes').send({}).expect(400);

    // A new code closes the books to the old one.
    const { body: renewed } = await http()
      .post('/api/admin/unlock-code/renew')
      .set(bearer(adminToken))
      .expect(200);
    expect(renewed.code).not.toBe(mine.code);
    await redeem(mine.code).expect(403);
    await redeem(renewed.code).expect(200);

    // So does deactivating the account.
    await http()
      .patch(`/api/admin/admins/${adminId}`)
      .set(bearer(superToken))
      .send({ active: false })
      .expect(200);
    await redeem(renewed.code).expect(403);
  });
});
