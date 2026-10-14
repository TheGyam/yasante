#!/usr/bin/env node
// Hands one task file to its implementer (Codex, Gemini, Sonnet or Haiku) on this machine.
//
//   node scripts/agent-task.mjs tasks/012-diary-repeat-badge.md
//   node scripts/agent-task.mjs tasks/012-diary-repeat-badge.md --revise
//
// --revise sends the agent back to its open PR: it reads the PR's review comments,
// fixes them on the same branch, and the script pushes to that PR.
//
// The agent works in its own git worktree beside this checkout (../yasante-agents/),
// so your checkout is untouched and Codex and Gemini can run at the same time.
// When it finishes, its branch is pushed and a draft PR is opened for Claude to review.
// Codex and Gemini use whatever login their CLI already has (ChatGPT / Google account).
// For Gemini that's Antigravity CLI (agy) when installed, else Gemini CLI.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Shell commands Sonnet and Haiku may run without asking: the checks tasks list
// (AGENTS.md) and read-only git. Anything else is refused, since nobody is there to approve it.
const CHECK_COMMANDS = [
  'npm ci',
  'npm test',
  'npm run lint',
  'npm run api:types',
  'npx tsc',
  'npx jest',
  'npx prettier',
  'npx prettier@3',
  'npx vite build',
  'python -m pytest',
  'python manage.py makemigrations',
  'python manage.py spectacular',
  'git status',
  'git diff',
  'git log',
].map(c => `Bash(${c}:*)`);

const claude = model => prompt => [
  'claude',
  [
    '-p',
    prompt,
    '--model',
    model,
    '--permission-mode',
    'acceptEdits',
    '--allowedTools',
    ...CHECK_COMMANDS,
  ],
];

const AGENTS = {
  codex: prompt => ['codex', ['exec', '-s', 'workspace-write', prompt]],
  sonnet: claude('sonnet'),
  haiku: claude('haiku'),
  // Antigravity CLI (agy) replaces Gemini CLI and uses your Google AI plan's models;
  // Gemini CLI is the fallback where agy isn't installed. agy may edit files on its own;
  // shell commands follow the allow rules in its /permissions. Pro by default; AGY_MODEL overrides.
  gemini: prompt =>
    has('agy')
      ? [
          'agy',
          [
            '--mode=accept-edits',
            '--model',
            process.env.AGY_MODEL || 'gemini-3.1-pro-high',
            '-p',
            prompt,
          ],
        ]
      : ['gemini', ['--yolo', '-p', prompt]],
};

function has(cmd) {
  const windows = process.platform === 'win32';
  return spawnSync(cmd, ['--version'], { stdio: 'ignore', shell: windows }).status === 0;
}

function fail(message) {
  console.error(`agent-task: ${message}`);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  // Windows finds codex.cmd / gemini.cmd only through the shell, which then needs the quoting.
  const windows = process.platform === 'win32';
  const argv = windows
    ? args.map(a => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a))
    : args;
  const result = spawnSync(cmd, argv, { stdio: 'inherit', shell: windows, ...opts });
  return result.status === 0;
}

function out(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  return result.status === 0 ? result.stdout.trim() : null;
}

const revise = process.argv.includes('--revise');
const task = process.argv.slice(2).find(a => !a.startsWith('--'));
if (!task) fail('usage: node scripts/agent-task.mjs tasks/<id>-<slug>.md [--revise]');

const root = out('git', ['rev-parse', '--show-toplevel']);
if (!root) fail('run this inside the repo');
const taskPath = path.join(root, task);
if (!existsSync(taskPath)) fail(`no such task file: ${task}`);

const text = readFileSync(taskPath, 'utf8');
const field = name => (text.match(new RegExp(`^${name}:\\s*([^\\s#]+)`, 'm')) || [])[1];
const agent = field('assignee');
const branch = field('branch');
const id = field('id');
const title = (text.match(/^# (.+)$/m) || [])[1] || task;

if (agent === 'opus') fail(`${task} is the lead's own task; Opus does it, nothing to dispatch`);
if (!AGENTS[agent])
  fail(`${task} is assigned to "${agent}"; the runner takes ${Object.keys(AGENTS).join(', ')}`);
if (!revise && field('status') !== 'ready') fail(`${task} is not status: ready`);
if (!branch || !branch.startsWith(`agent/${agent}/`))
  fail(`branch must start with agent/${agent}/`);

// The task file must already be on master, so the agent's branch starts from it.
if (!run('git', ['fetch', 'origin', 'master'], { cwd: root })) fail('git fetch failed');
if (out('git', ['cat-file', '-e', `origin/master:${task}`], { cwd: root }) === null) {
  fail(`${task} is not on origin/master yet; commit and push it first`);
}

const worktree = path.join(path.dirname(root), 'yasante-agents', branch.replace(/\//g, '-'));
// What the branch had before this run; anything past it is the agent's new work.
let base = 'origin/master';
let prompt = `You are an implementer on this repo, not the lead. Follow AGENTS.md exactly. Your task is ${task}.`;
const reviewFile = path.join(worktree, '.agent-review.md');

if (revise) {
  if (!run('git', ['fetch', 'origin', branch], { cwd: root }))
    fail(`no ${branch} on origin to revise`);
  base = `origin/${branch}`;
  if (existsSync(worktree)) {
    if (!run('git', ['merge', '--ff-only', base], { cwd: worktree }))
      fail(`${worktree} has diverged from ${base}`);
  } else if (!run('git', ['worktree', 'add', '-B', branch, worktree, base], { cwd: root })) {
    fail('could not create the worktree');
  }
  const review = out('gh', ['pr', 'view', branch, '--comments'], { cwd: worktree });
  if (!review) fail(`could not read the review on ${branch}'s PR (is gh signed in?)`);
  writeFileSync(reviewFile, review);
  prompt +=
    ' Claude reviewed your pull request; the PR and its review comments are in .agent-review.md.' +
    ' Fix every blocking item and the minor ones, within the task scope, then update your Report to the lead' +
    ' and keep status: review. Do not commit .agent-review.md.';
} else {
  if (existsSync(worktree))
    fail(`${worktree} already exists; remove it with "git worktree remove" first`);
  if (!run('git', ['worktree', 'add', '-b', branch, worktree, base], { cwd: root })) {
    fail('could not create the worktree (does the branch already exist?)');
  }
}

console.log(`\n${agent} is ${revise ? 'revising' : 'working on'} ${task} in ${worktree}\n`);
const [cmd, args] = AGENTS[agent](prompt);
if (!run(cmd, args, { cwd: worktree }))
  console.error(`\n${agent} exited with an error; committing whatever it left.`);
rmSync(reviewFile, { force: true });

run('git', ['add', '-A'], { cwd: worktree });
if (out('git', ['diff', '--cached', '--quiet'], { cwd: worktree }) === null) {
  const message = revise ? `Address review comments: ${title}` : title;
  run('git', ['commit', '-m', message], { cwd: worktree });
}
if (out('git', ['rev-list', '--count', `${base}..HEAD`], { cwd: worktree }) === '0') {
  if (revise) fail(`${agent} changed nothing in response to the review`);
  // Nothing to keep, so leave nothing behind: a rerun would stop on the worktree.
  run('git', ['worktree', 'remove', '--force', worktree], { cwd: root });
  run('git', ['branch', '-D', branch], { cwd: root });
  fail(`${agent} changed nothing; removed its worktree and branch`);
}
if (!run('git', ['push', '-u', 'origin', branch], { cwd: worktree })) fail('push failed');
if (revise) {
  console.log(
    `\nPushed ${agent}'s fixes to ${branch}; its PR is updated and ready for another review.`
  );
  process.exit(0);
}

const body = `Does the work described in \`${task}\`. Ready for review against its acceptance criteria.`;
if (
  !run(
    'gh',
    [
      'pr',
      'create',
      '--draft',
      '--base',
      'master',
      '--head',
      branch,
      '--title',
      `[${id}] ${title}`,
      '--body',
      body,
    ],
    { cwd: worktree }
  )
) {
  console.log(`\nPushed ${branch}. Open a draft PR for it on GitHub (gh isn't set up here).`);
}
