const { client } = require('./supabase');

const toDbKey = (key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const fromDbRow = (row) => {
  if (!row) return row;
  return Object.entries(row).reduce((result, [key, value]) => {
    result[key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    return result;
  }, {});
};
const toDbValues = (values) => Object.entries(values).reduce((result, [key, value]) => {
  result[toDbKey(key)] = value;
  return result;
}, {});

function applyFilters(query, filter) {
  return Object.entries(filter || {}).reduce((current, [key, value]) => current.eq(key === '_id' ? 'id' : toDbKey(key), value), query);
}

function queryResult(run) {
  let selection = null;
  const query = {
    sort() { return query; },
    select(fields) { selection = fields; return query; },
    then(resolve, reject) {
      return run().then((result) => {
        if (selection === '-password' && Array.isArray(result)) {
          return result.map(({ password, ...safe }) => safe);
        }
        if (selection === '-password' && result) {
          const { password, ...safe } = result;
          return safe;
        }
        return result;
      }).then(resolve, reject);
    },
    catch(reject) { return run().catch(reject); },
  };
  return query;
}

function createSupabaseModel(table) {
  return {
    find(filter = {}) {
      return queryResult(async () => {
        const { data, error } = await applyFilters(client.from(table).select('*'), filter).order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(fromDbRow);
      });
    },

    findOne(filter = {}) {
      return queryResult(async () => {
        const { data, error } = await applyFilters(client.from(table).select('*'), filter).limit(1).maybeSingle();
        if (error) throw error;
        return fromDbRow(data);
      });
    },

    create(values) {
      return client.from(table).insert(toDbValues(values)).select('*').single().then(({ data, error }) => {
        if (error) throw error;
        return fromDbRow(data);
      });
    },

    findByIdAndUpdate(id, values) {
      return client.from(table).update(toDbValues(values)).eq('id', id).select('*').maybeSingle().then(({ data, error }) => {
        if (error) throw error;
        return fromDbRow(data);
      });
    },

    findOneAndUpdate(filter, values) {
      return applyFilters(client.from(table).update(toDbValues(values)).select('*'), filter).maybeSingle().then(({ data, error }) => {
        if (error) throw error;
        return fromDbRow(data);
      });
    },

    findByIdAndDelete(id) {
      return client.from(table).delete().eq('id', id).select('*').maybeSingle().then(({ data, error }) => {
        if (error) throw error;
        return fromDbRow(data);
      });
    },
  };
}

module.exports = createSupabaseModel;