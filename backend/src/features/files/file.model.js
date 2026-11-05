/**
 * File Data Access Layer (Model)
 * Performs direct database queries on project_files table using the request-scoped Supabase client.
 */

export const create = async (supabase, {
  projectId,
  userId,
  filePath,
  storagePath,
  contentHash,
  sizeBytes,
  mimeType,
}) => {
  const { data, error } = await supabase
    .from('project_files')
    .insert({
      project_id: projectId,
      user_id: userId,
      file_path: filePath,
      storage_path: storagePath,
      content_hash: contentHash,
      size_bytes: sizeBytes,
      mime_type: mimeType,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const findByProjectIdAndUserId = async (supabase, projectId, userId) => {
  const { data, error } = await supabase
    .from('project_files')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .order('file_path', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const findByIdAndUserId = async (supabase, fileId, userId) => {
  const { data, error } = await supabase
    .from('project_files')
    .select('*')
    .eq('id', fileId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const findByPath = async (supabase, projectId, userId, filePath) => {
  const { data, error } = await supabase
    .from('project_files')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('file_path', filePath)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const updateMetadata = async (supabase, fileId, userId, {
  contentHash,
  sizeBytes,
  mimeType,
  version,
}) => {
  const { data, error } = await supabase
    .from('project_files')
    .update({
      content_hash: contentHash,
      size_bytes: sizeBytes,
      mime_type: mimeType,
      version: version,
      updated_at: new Date().toISOString(),
    })
    .eq('id', fileId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const deleteById = async (supabase, fileId, userId) => {
  const { data, error } = await supabase
    .from('project_files')
    .delete()
    .eq('id', fileId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

