## Linked Entities Visibility Plan

### 1. Summary & Goals
- Surface linked contacts for each job (count, list, timeline context) so users can confirm associations from the UI.
- Ensure new contacts created via job linking or job wizard appear immediately in the Contacts module and drawer timelines.
- Enhance contact timeline entries to show the related job/company and outreach context (channel, message type).

### 2. Current Observations
- Jobs list only shows a `Contacts (#)` count with no way to view actual contact names from cards or job drawer/history.
- Newly created contacts (via Link Contact dialog or job wizard inline creation) do not show up when opening ContactDrawer or are missing timeline context.
- Contact timeline outreach entries lack job references, making the interactions ambiguous.

### 3. Tasks
1. **Jobs UI Enhancements**
   - [x] Add contact chips/list to job pipeline cards and table rows to reveal linked people at a glance.
   - [x] Provide quick access to open associated ContactDrawer from job screens.
   - [x] Update Jobs history modal timeline to display enriched contact/job context (existing labels partially cover this).
2. **Contacts Sync**
   - [x] Ensure mutation success handlers invalidate contact lists/details so new contacts surface immediately.
   - [x] When creating contacts inline, route the app to highlight the new contact automatically (toast + manual open currently available).
3. **Timeline Context**
   - [x] Adjust backend `ContactsService.getById` to include job summary on outreach entries.
   - [x] Update frontend timeline rendering to show job/company context for outreach events.
4. **Testing**
   - [x] Add targeted Vitest coverage for the new contact chip rendering.
   - [x] Extend backend tests to verify enriched outreach payloads.
5. **Docs Update**
   - [x] Document new UI capabilities in Jobs & Contacts module docs.
