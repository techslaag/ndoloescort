const sdk = require('node-appwrite');

module.exports = async function (req, res) {
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);
  const users = new sdk.Users(client);

  // Initialize Appwrite client
  client
    .setEndpoint(req.variables['APPWRITE_ENDPOINT'])
    .setProject(req.variables['APPWRITE_PROJECT_ID'])
    .setKey(req.variables['APPWRITE_API_KEY']);

  // Get request data
  const { messageId } = req.payload;
  const userId = req.variables['APPWRITE_FUNCTION_USER_ID'];

  if (!messageId) {
    return res.json({ success: false, error: 'Message ID is required' }, 400);
  }

  if (!userId) {
    return res.json({ success: false, error: 'User must be authenticated' }, 401);
  }

  try {
    // Get the message
    const message = await databases.getDocument(
      req.variables['DATABASE_ID'],
      req.variables['MESSAGES_COLLECTION_ID'],
      messageId
    );

    // Check if the current user is the receiver
    if (message.receiverId !== userId) {
      return res.json({ 
        success: false, 
        error: 'You can only mark messages as read if you are the receiver' 
      }, 403);
    }

    // Update only isRead and readAt fields
    const updatedMessage = await databases.updateDocument(
      req.variables['DATABASE_ID'],
      req.variables['MESSAGES_COLLECTION_ID'],
      messageId,
      {
        isRead: true,
        readAt: new Date().toISOString()
      }
    );

    return res.json({ 
      success: true, 
      message: updatedMessage 
    });

  } catch (error) {
    console.error('Error marking message as read:', error);
    return res.json({ 
      success: false, 
      error: error.message || 'Failed to mark message as read' 
    }, 500);
  }
};