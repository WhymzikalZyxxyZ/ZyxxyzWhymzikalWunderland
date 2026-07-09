import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql }                        from 'drizzle-orm';
import type { ProjectType, ProjectStatus, PubType, ManufacturerType } from '../types';

const now  = sql`(datetime('now'))`;
const uuid = () => crypto.randomUUID();

// ── Users ─────────────────────────────────────────────────────────────────────

export const users = sqliteTable('users', {
    userId:       text('user_id').primaryKey().$defaultFn(uuid),
    username:     text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    createdAt:    text('created_at').notNull().default(now),
    isActive:     integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

// ── Sessions ──────────────────────────────────────────────────────────────────

export const sessions = sqliteTable('sessions', {
    sessionId: text('session_id').primaryKey().$defaultFn(uuid),
    userId:    text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull().default(now),
});

// ── Genres (shared lookup) ────────────────────────────────────────────────────

export const genres = sqliteTable('genres', {
    id:        text('id').primaryKey().$defaultFn(uuid),
    name:      text('name').notNull(),
    parentId:  text('parent_id'),
    createdAt: text('created_at').notNull().default(now),
});

// ── Series ────────────────────────────────────────────────────────────────────

export const series = sqliteTable('series', {
    id:          text('id').primaryKey().$defaultFn(uuid),
    userId:      text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
    name:        text('name').notNull(),
    description: text('description'),
    createdAt:   text('created_at').notNull().default(now),
    updatedAt:   text('updated_at').notNull().default(now),
});

// ── Projects ──────────────────────────────────────────────────────────────────

export const projects = sqliteTable('projects', {
    id:              text('id').primaryKey().$defaultFn(uuid),
    userId:          text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
    seriesId:        text('series_id').references(() => series.id, { onDelete: 'set null' }),
    seriesNumber:    integer('series_number'),
    title:           text('title').notNull(),
    type:            text('type').notNull().$type<ProjectType>(),
    genreId:         text('genre_id').references(() => genres.id, { onDelete: 'set null' }),
    status:          text('status').notNull().default('drafting').$type<ProjectStatus>(),
    blurb:           text('blurb'),
    summary:         text('summary'),
    targetWordCount: integer('target_word_count').default(50000),
    totalWords:      integer('total_words').notNull().default(0),
    coverKey:        text('cover_key'),
    altCoverKeys:    text('alt_cover_keys').notNull().default('[]'),
    mainCoverKey:    text('main_cover_key'),
    pubType:         text('pub_type').$type<PubType>(),
    createdAt:       text('created_at').notNull().default(now),
    updatedAt:       text('updated_at').notNull().default(now),
});

// ── Pages (writing pad — one per day per project) ──────────────────────────────

export const pages = sqliteTable('pages', {
    id:        text('id').primaryKey().$defaultFn(uuid),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    userId:    text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
    pageDate:  text('page_date').notNull(),
    title:     text('title'),
    content:   text('content').notNull().default(''),
    wordCount: integer('word_count').notNull().default(0),
    createdAt: text('created_at').notNull().default(now),
    updatedAt: text('updated_at').notNull().default(now),
}, (t) => ({
    uniqueProjectDate: uniqueIndex('pages_project_date_uniq').on(t.projectId, t.pageDate),
}));

// ── Chapters (writing pad — numbered per project) ──────────────────────────────

export const chapters = sqliteTable('chapters', {
    id:              text('id').primaryKey().$defaultFn(uuid),
    projectId:       text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    userId:          text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
    chapterNumber:   integer('chapter_number').notNull(),
    title:           text('title'),
    content:         text('content').notNull().default(''),
    wordCount:       integer('word_count').notNull().default(0),
    targetWordCount: integer('target_word_count').notNull().default(0),
    createdAt:       text('created_at').notNull().default(now),
    updatedAt:       text('updated_at').notNull().default(now),
}, (t) => ({
    uniqueProjectChapter: uniqueIndex('chapters_project_number_uniq').on(t.projectId, t.chapterNumber),
}));

// ── Characters ────────────────────────────────────────────────────────────────

export const characters = sqliteTable('characters', {
    id:                  text('id').primaryKey().$defaultFn(uuid),
    projectId:           text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    userId:              text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
    name:                text('name').notNull(),
    age:                 text('age'),
    physicalDescription: text('physical_description'),
    notes:               text('notes'),
    sortOrder:           integer('sort_order').notNull().default(0),
    createdAt:           text('created_at').notNull().default(now),
    updatedAt:           text('updated_at').notNull().default(now),
});

export const characterImages = sqliteTable('character_images', {
    id:          text('id').primaryKey().$defaultFn(uuid),
    characterId: text('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
    storageKey:  text('storage_key').notNull(),
    caption:     text('caption'),
    sortOrder:   integer('sort_order').notNull().default(0),
});

// ── Commissions ───────────────────────────────────────────────────────────────

export const commissions = sqliteTable('commissions', {
    id:          text('id').primaryKey().$defaultFn(uuid),
    projectId:   text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    userId:      text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
    who:         text('who').notNull(),
    amountCents: integer('amount_cents'),
    description: text('description').notNull(),
    deadline:    text('deadline'),
    done:        integer('done', { mode: 'boolean' }).notNull().default(false),
    createdAt:   text('created_at').notNull().default(now),
});

// ── Comp Titles ───────────────────────────────────────────────────────────────

export const compTitles = sqliteTable('comp_titles', {
    id:        text('id').primaryKey().$defaultFn(uuid),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    title:     text('title').notNull(),
    author:    text('author').notNull(),
    year:      integer('year'),
    reason:    text('reason'),
    createdAt: text('created_at').notNull().default(now),
});

// ── Publishing ────────────────────────────────────────────────────────────────

export const publishing = sqliteTable('publishing', {
    id:                 text('id').primaryKey().$defaultFn(uuid),
    projectId:          text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }).unique(),
    userId:             text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
    pubType:            text('pub_type').notNull().$type<PubType>(),
    datePublished:      text('date_published'),
    isbn:               text('isbn'),
    publisherName:      text('publisher_name'),
    dealDetails:        text('deal_details'),
    contractStorageKey: text('contract_storage_key'),
    createdAt:          text('created_at').notNull().default(now),
    updatedAt:          text('updated_at').notNull().default(now),
});

export const publishingSizes = sqliteTable('publishing_sizes', {
    id:        text('id').primaryKey().$defaultFn(uuid),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    sizeLabel: text('size_label').notNull(),
    format:    text('format').notNull(),
});

// ── Distribution ──────────────────────────────────────────────────────────────

export const distribution = sqliteTable('distribution', {
    id:        text('id').primaryKey().$defaultFn(uuid),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    channel:   text('channel').notNull(),
    label:     text('label').notNull(),
    url:       text('url'),
    inventory: integer('inventory').notNull().default(0),
    onOrder:   integer('on_order').notNull().default(0),
    notes:     text('notes'),
});

// ── Project Art / Mood Board ──────────────────────────────────────────────────

export const projectArt = sqliteTable('project_art', {
    id:         text('id').primaryKey().$defaultFn(uuid),
    projectId:  text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    userId:     text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
    storageKey: text('storage_key').notNull(),
    label:      text('label'),
    sortOrder:  integer('sort_order').notNull().default(0),
});

// ── Events ────────────────────────────────────────────────────────────────────

export const events = sqliteTable('events', {
    id:                    text('id').primaryKey().$defaultFn(uuid),
    userId:                text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
    projectId:             text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    name:                  text('name').notNull(),
    date:                  text('date'),
    endDate:               text('end_date'),
    startTime:             text('start_time'),
    endTime:               text('end_time'),
    location:              text('location'),
    address:               text('address'),
    attendanceExpected:    integer('attendance_expected'),
    attendanceActual:      integer('attendance_actual'),
    notes:                 text('notes'),
    costTableCents:        integer('cost_table_cents').notNull().default(0),
    costHotelCents:        integer('cost_hotel_cents').notNull().default(0),
    costGasCents:          integer('cost_gas_cents').notNull().default(0),
    costOtherCents:        integer('cost_other_cents').notNull().default(0),
    costOtherDescription:  text('cost_other_description'),
});

export const eventSales = sqliteTable('event_sales', {
    id:               text('id').primaryKey().$defaultFn(uuid),
    eventId:          text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    projectId:        text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    userId:           text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
    quantityBrought:  integer('quantity_brought').notNull().default(0),
    quantitySold:     integer('quantity_sold').notNull().default(0),
    priceCents:       integer('price_cents').notNull().default(0),
    notes:            text('notes'),
});

// ── Inventory ──────────────────────────────────────────────────────────────────

export const inventory = sqliteTable('inventory', {
    id:            text('id').primaryKey().$defaultFn(uuid),
    projectId:     text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    userId:        text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
    channel:       text('channel').notNull().$type<'inperson' | 'online' | 'kdp'>(),
    platform:      text('platform'),
    label:         text('label').notNull(),
    costCents:     integer('cost_cents').notNull().default(0),
    priceCents:    integer('price_cents').notNull().default(0),
    stockCount:    integer('stock_count').notNull().default(0),
    stockOnOrder:  integer('stock_on_order').notNull().default(0),
    available:     integer('available', { mode: 'boolean' }).notNull().default(true),
    availableUrl:  text('available_url'),
    createdAt:     text('created_at').notNull().default(now),
    updatedAt:     text('updated_at').notNull().default(now),
});

// ── Sales Records ──────────────────────────────────────────────────────────────

export const salesRecords = sqliteTable('sales_records', {
    id:            text('id').primaryKey().$defaultFn(uuid),
    projectId:     text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    userId:        text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
    inventoryId:   text('inventory_id').references(() => inventory.id, { onDelete: 'set null' }),
    channel:       text('channel').notNull().$type<'inperson' | 'online' | 'kdp'>(),
    platform:      text('platform'),
    quantity:      integer('quantity').notNull().default(1),
    revenueCents:  integer('revenue_cents').notNull().default(0),
    royaltyCents:  integer('royalty_cents'),
    pagesRead:     integer('pages_read'),
    saleDate:      text('sale_date'),
    notes:         text('notes'),
    source:        text('source').notNull().default('manual'),
    createdAt:     text('created_at').notNull().default(now),
});

// ── Bundles ────────────────────────────────────────────────────────────────────

export const bundles = sqliteTable('bundles', {
    id:          text('id').primaryKey().$defaultFn(uuid),
    userId:      text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
    name:        text('name').notNull(),
    description: text('description'),
    priceCents:  integer('price_cents').notNull().default(0),
    createdAt:   text('created_at').notNull().default(now),
    updatedAt:   text('updated_at').notNull().default(now),
});

export const bundleItems = sqliteTable('bundle_items', {
    id:        text('id').primaryKey().$defaultFn(uuid),
    bundleId:  text('bundle_id').notNull().references(() => bundles.id, { onDelete: 'cascade' }),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    quantity:  integer('quantity').notNull().default(1),
});

// ── Manufacturers / Printers ──────────────────────────────────────────────────

export const manufacturers = sqliteTable('manufacturers', {
    id:          text('id').primaryKey().$defaultFn(uuid),
    projectId:   text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    userId:      text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
    name:        text('name').notNull(),
    type:        text('type').notNull().$type<ManufacturerType>(),
    contactInfo: text('contact_info'),
    notes:       text('notes'),
});

// ── Social Links ──────────────────────────────────────────────────────────────

export const socialLinks = sqliteTable('social_links', {
    id:        text('id').primaryKey().$defaultFn(uuid),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    platform:  text('platform').notNull(),
    url:       text('url').notNull(),
    handle:    text('handle'),
});
