/**
 * Project Data Access Layer (Model)
 * Performs direct database queries using the request-scoped Supabase client.
 */

export const create = async (supabase, { userId, name, stack }) => {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name,
      stack,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const findByUserId = async (supabase, userId) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const findByIdAndUserId = async (supabase, projectId, userId) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const updateNameById = async (supabase, projectId, userId, name) => {
  const { data, error } = await supabase
    .from('projects')
    .update({ name })
    .eq('id', projectId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const deleteById = async (supabase, projectId, userId) => {
  const { data, error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

