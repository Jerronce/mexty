/**
 * Resume Generator Service - Client Side
 * Calls the backend Cloud Function to generate resumes and cover letters
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

const functions = getFunctions(app);

/**
 * Generate a resume PDF based on user profile and job details
 * @param {Object} params - Generation parameters
 * @param {string} params.userId - User ID for fetching profile data
 * @param {string} params.jobTitle - Target job title
 * @param {string} params.jobDescription - Job description to tailor the resume
 * @param {string} params.companyName - Company name
 * @param {Object} params.preferences - Resume preferences (template, sections, etc.)
 * @returns {Promise<Object>} Object containing download URL and document metadata
 */
export const generateResume = async (params) => {
  try {
    const generateResumeFunc = httpsCallable(functions, 'generateResume');
    const result = await generateResumeFunc(params);
    return result.data;
  } catch (error) {
    console.error('Error generating resume:', error);
    throw new Error(error.message || 'Failed to generate resume');
  }
};

/**
 * Generate a cover letter PDF based on user profile and job details
 * @param {Object} params - Generation parameters
 * @param {string} params.userId - User ID for fetching profile data
 * @param {string} params.jobTitle - Target job title
 * @param {string} params.jobDescription - Job description
 * @param {string} params.companyName - Company name
 * @param {string} params.hiringManager - Hiring manager name (optional)
 * @param {Object} params.preferences - Cover letter preferences
 * @returns {Promise<Object>} Object containing download URL and document metadata
 */
export const generateCoverLetter = async (params) => {
  try {
    const generateCoverLetterFunc = httpsCallable(functions, 'generateCoverLetter');
    const result = await generateCoverLetterFunc(params);
    return result.data;
  } catch (error) {
    console.error('Error generating cover letter:', error);
    throw new Error(error.message || 'Failed to generate cover letter');
  }
};

/**
 * Get download URL for a previously generated document
 * @param {string} documentId - Document ID
 * @returns {Promise<string>} Download URL
 */
export const getDocumentUrl = async (documentId) => {
  try {
    const getUrlFunc = httpsCallable(functions, 'getDocumentUrl');
    const result = await getUrlFunc({ documentId });
    return result.data.url;
  } catch (error) {
    console.error('Error getting document URL:', error);
    throw new Error(error.message || 'Failed to get document URL');
  }
};

/**
 * List all generated documents for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of document metadata
 */
export const listUserDocuments = async (userId) => {
  try {
    const listDocsFunc = httpsCallable(functions, 'listUserDocuments');
    const result = await listDocsFunc({ userId });
    return result.data.documents;
  } catch (error) {
    console.error('Error listing documents:', error);
    throw new Error(error.message || 'Failed to list documents');
  }
};
