# Discord Image Tournament Bot Plan

## Goal

Build a Node.js Discord bot that runs image tournaments.

The bot should:

- Accept up to 32 images.
- Split entries into 2 brackets.
- Generate and post bracket images.
- Run polls for each matchup.
- Advance winners each round.
- Announce the final champion.

## Recommended Stack

- Node.js
- discord.js
- dotenv
- SQLite for persistence later
- sharp or canvas for bracket image generation later

For the first version, use Discord buttons for voting instead of Discord's native poll feature. Buttons are easier to count, validate, and automate.

## Core Bot Flow

1. User runs `/tournament create`.
2. Bot creates a tournament session.
3. User uploads images in the tournament channel.
4. User runs `/tournament start`.
5. Bot validates the image count.
6. Bot shuffles the entries.
7. Bot splits entries into 2 brackets.
8. Bot posts bracket images.
9. Bot posts poll messages for each matchup.
10. Users vote using buttons.
11. Bot closes each poll after a time limit.
12. Winners advance to the next round.
13. Bot updates the bracket images.
14. The two bracket winners face each other in the final.
15. Bot announces the champion.

## First Concrete Milestone

Build this before anything more complex:

1. `/tournament create`
2. Upload 4 images.
3. `/tournament start`
4. Bot posts 2 match polls.
5. Users vote with buttons.
6. Bot announces 2 winners.
7. Bot posts a final poll.
8. Bot announces the champion.

Once this works, expand to 8, 16, then 32 images.

## Phase 1: Project Setup

- Create a Node.js project.
- Install `discord.js`, `dotenv`, and a dev runner such as `nodemon`.
- Create a Discord application and bot token.
- Add the bot to a test Discord server.
- Register slash commands.
- Add a basic `/ping` command to verify the bot works.

## Phase 2: Tournament Commands

- Add `/tournament create`.
- Add `/tournament status`.
- Add `/tournament cancel`.
- Add `/tournament start`.
- Store active tournaments per Discord channel or per server.
- Prevent multiple active tournaments in the same channel for the first version.

## Phase 3: Image Collection

- After `/tournament create`, let the creator upload images in normal Discord messages.
- Listen for message attachments.
- Accept only image files.
- Store image URLs and metadata.
- Enforce a maximum of 32 images.
- Add `/tournament status` to show the current image count.
- Require at least 4 images before starting.

Slash commands are not ideal for accepting 32 image attachments directly, so collecting attachments from follow-up messages is the better design.

## Phase 4: Bracket Generation

- Shuffle submitted images.
- Split images into 2 brackets.
- For 32 images, each bracket gets 16 images.
- For fewer images, divide entries as evenly as possible.
- Generate first-round matches.
- Handle odd image counts with byes.
- Store match data in memory first.
- Add SQLite persistence later.

Suggested data structure:

```js
Tournament
- id
- guildId
- channelId
- creatorId
- status
- entries
- matches
- createdAt

Entry
- id
- tournamentId
- imageUrl
- seed
- bracketSide

Match
- id
- tournamentId
- round
- bracketSide
- entryAId
- entryBId
- winnerEntryId
- status
```

## Phase 5: Voting Polls

- For each match, post a Discord message with both images.
- Add two buttons: `Vote A` and `Vote B`.
- Store each user's vote.
- Decide whether vote changes are allowed.
- Add a voting duration, such as 5 minutes.
- When the poll closes, count votes.
- Advance the winner.
- Handle ties.

Recommended first-version tie behavior: let the tournament creator choose the winner.

## Phase 6: Round Advancement

- Detect when every match in a round is complete.
- Generate next-round matches.
- Post new poll messages.
- Continue until each bracket has one winner.
- Run the final match between the two bracket winners.
- Announce the final winner.

## Phase 7: Bracket Image Rendering

- Pick a rendering library, probably `sharp` first.
- Download or cache image thumbnails.
- Create a simple bracket image layout.
- Show matchup slots.
- Show winners as rounds progress.
- Generate separate images for Bracket A and Bracket B.
- Optionally generate one combined full tournament bracket later.

Start simple: thumbnails, labels like `Image 1`, `Image 2`, and basic connecting lines.

## Phase 8: Persistence

- Add SQLite.
- Save tournaments, entries, matches, and votes.
- Make the bot recover after restart.
- On startup, reload active tournaments.
- Decide what happens to polls that were active during downtime.

For the first version, keeping active tournaments in memory is acceptable.

## Phase 9: Permissions and Safety

- Only the tournament creator can start or cancel their tournament.
- Limit uploads to images.
- Limit image count to 32.
- Limit image size.
- Ignore images from other channels.
- Prevent voting after a poll closes.
- Prevent the bot from handling old interactions incorrectly.

## Phase 10: Polish

- Add `/tournament list`.
- Add custom tournament names.
- Add configurable voting duration.
- Add random seeding or manual seeding.
- Add image captions.
- Add replayable bracket history.
- Add admin-only settings.

## Recommended Build Order

1. Basic Discord bot runs.
2. Slash commands work.
3. `/tournament create` creates an in-memory tournament.
4. Bot collects image attachments.
5. `/tournament start` shuffles and creates matches.
6. Bot posts simple text-based matches.
7. Button voting works.
8. Winners advance.
9. Full tournament can complete.
10. Add generated bracket images.
11. Add SQLite persistence.

## Current Progress

Completed:

- Created the Node.js project scaffold.
- Installed `discord.js`, `dotenv`, and `nodemon`.
- Added `.env.example` and created local `.env` with Discord credentials.
- Added `.gitignore` with `.env` and `node_modules` ignored.
- Registered guild slash commands successfully.
- Verified the bot logs in successfully as `Club House Avatar Tournament Bot#9279`.
- Added `/ping`.
- Added `/tournament create`, `/tournament status`, `/tournament cancel`, and `/tournament start`.
- Added an in-memory active tournament store keyed by channel.
- Added image attachment collection from normal Discord messages during collection status.

Current implementation limits:

- `/tournament start` is still a placeholder.
- Bracket generation is not implemented yet.
- Button voting is not implemented yet.
- Winner advancement and champion announcement are not implemented yet.
- Bracket image rendering and SQLite persistence are intentionally deferred.

Next recommended milestone:

1. Limit the first version to exactly 4 image entries.
2. Generate 2 semifinal matches on `/tournament start`.
3. Post simple match messages with `Vote A` and `Vote B` buttons.
4. Track one vote per user per match.
5. Advance semifinal winners into a final match.
6. Announce the champion.

## Resume Prompt

When coming back later, use this prompt:

```txt
Continue helping me build the Discord image tournament bot from PROJECT_PLAN.md.
```
