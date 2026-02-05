// api/prep-dashboard/checklists/_storage.js
// Shared storage layer for checklist persistence using Vercel KV

import { kv } from '@vercel/kv';

// Key format: checklist:{date}:{templateId}
// Value: { responses: {itemId: value}, completion: null|{completedAt, completedBy}, progress: number, total: number }

function getChecklistKey(date, templateId) {
  return `checklist:${date}:${templateId}`;
}

function getCompletionsIndexKey(date) {
  return `checklist-completions:${date}`;
}

/**
 * Get a checklist session (responses and completion status)
 */
export async function getChecklistSession(date, templateId) {
  try {
    const key = getChecklistKey(date, templateId);
    const data = await kv.get(key);
    return data || { responses: {}, completion: null, progress: 0, total: 0 };
  } catch (error) {
    console.error('KV get error:', error);
    // Return empty session on error (graceful degradation)
    return { responses: {}, completion: null, progress: 0, total: 0 };
  }
}

/**
 * Save a response to a checklist item
 */
export async function saveResponse(date, templateId, itemId, value, totalItems) {
  try {
    const key = getChecklistKey(date, templateId);
    const session = await getChecklistSession(date, templateId);

    // Update responses
    session.responses[itemId] = value;
    session.total = totalItems;

    // Recalculate progress (count non-null responses)
    session.progress = Object.values(session.responses).filter(v => v !== null && v !== undefined && v !== '').length;

    await kv.set(key, session);

    return {
      success: true,
      progress: session.progress,
      total: session.total
    };
  } catch (error) {
    console.error('KV save response error:', error);
    throw error;
  }
}

/**
 * Mark a checklist as complete
 */
export async function markComplete(date, templateId, completedBy, totalItems) {
  try {
    const key = getChecklistKey(date, templateId);
    const session = await getChecklistSession(date, templateId);

    const completion = {
      id: `${date}-${templateId}-${Date.now()}`,
      templateId,
      date,
      completedAt: new Date().toISOString(),
      completedBy: completedBy || 'Staff',
      responses: session.responses
    };

    session.completion = completion;
    session.progress = totalItems;
    session.total = totalItems;

    await kv.set(key, session);

    // Also add to the completions index for the date
    await addToCompletionsIndex(date, templateId, completion);

    return {
      success: true,
      completion
    };
  } catch (error) {
    console.error('KV mark complete error:', error);
    throw error;
  }
}

/**
 * Add a completion to the date's index (for history queries)
 */
async function addToCompletionsIndex(date, templateId, completion) {
  try {
    const indexKey = getCompletionsIndexKey(date);
    const index = await kv.get(indexKey) || {};
    index[templateId] = completion;
    await kv.set(indexKey, index);
  } catch (error) {
    console.error('KV index update error:', error);
    // Non-critical - don't throw
  }
}

/**
 * Get all completions for a date (for hub page status)
 */
export async function getCompletionsForDate(date) {
  try {
    const indexKey = getCompletionsIndexKey(date);
    const index = await kv.get(indexKey) || {};
    return index;
  } catch (error) {
    console.error('KV get completions error:', error);
    return {};
  }
}

/**
 * Get completions in a date range (for history page)
 */
export async function getCompletionsInRange(fromDate, toDate) {
  try {
    const completions = [];
    const from = new Date(fromDate);
    const to = new Date(toDate);

    // Iterate through each date in range
    const current = new Date(from);
    while (current <= to) {
      const dateStr = current.toISOString().split('T')[0];
      const dayCompletions = await getCompletionsForDate(dateStr);

      for (const completion of Object.values(dayCompletions)) {
        completions.push(completion);
      }

      current.setDate(current.getDate() + 1);
    }

    // Sort by completedAt descending
    completions.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    return completions;
  } catch (error) {
    console.error('KV get range error:', error);
    return [];
  }
}

/**
 * Get the status of a checklist (for hub page listing)
 */
export async function getChecklistStatus(date, templateId, totalItems) {
  try {
    const session = await getChecklistSession(date, templateId);

    if (session.completion) {
      return {
        status: 'completed',
        progress: totalItems,
        total: totalItems,
        completedAt: session.completion.completedAt,
        completedBy: session.completion.completedBy
      };
    }

    if (session.progress > 0) {
      return {
        status: 'in-progress',
        progress: session.progress,
        total: totalItems
      };
    }

    return {
      status: 'not-started',
      progress: 0,
      total: totalItems
    };
  } catch (error) {
    console.error('KV get status error:', error);
    return {
      status: 'not-started',
      progress: 0,
      total: totalItems
    };
  }
}
