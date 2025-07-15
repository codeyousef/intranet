'use client'

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

// Interface for our file items
export interface IFileItem {
  name: string;
  path: string;
}

// Props interface for the component
export interface INewsletterArchiveProps {
  context: any; // Session context
}

const NewsletterArchive: React.FC<INewsletterArchiveProps> = (props) => {
  const [files, setFiles] = useState<IFileItem[]>([]);
  // State for the currently selected file HTML content for the iframe srcdoc
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  // State to track the currently active file path for styling
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  // State for loading indicator while fetching content
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // State for error messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Configuration ---
  // Path to the folder containing the HTML files.
  const folderServerRelativeUrl = "/CEO Newsletter/Archive";
  // --- End Configuration ---

  // Effect to generate the file list once when the component mounts
  useEffect(() => {
    const generatedFiles: IFileItem[] = [];
    try {
      for (let i = 38; i <= 60; i++) {
        let fileName = "";
        let displayName = "";

        if (i === 38) {
          fileName = "38 & 39.html";
          displayName = "38 & 39";
          i = 39; // Skip 39
        } else if (i === 52) {
          fileName = "52&53.html";
          displayName = "52 & 53";
          i = 53; // Skip 53
        } else {
          fileName = `${i}.html`;
          displayName = `${i}`;
        }
        // Store the server-relative path for the REST API call
        const filePath = `${folderServerRelativeUrl}/${fileName}`;
        generatedFiles.push({ name: displayName, path: filePath });
      }
      setFiles(generatedFiles);
    } catch (error) {
      console.error("Error generating file list:", error);
      setErrorMessage("Error preparing file list.");
    }
  }, [folderServerRelativeUrl]); // Rerun effect if folder path changes

  // Function to handle clicking a file link
  const handleFileClick = async (event: React.MouseEvent<HTMLAnchorElement>, fileItemPath: string) => {
    event.preventDefault();
    setIsLoading(true);
    setSelectedFileContent(null);
    setErrorMessage(null);

    // Set the active file path for styling
    setActiveFilePath(fileItemPath);

    try {
      // Construct the API URL to fetch the file content
      const encodedFilePath = encodeURIComponent(fileItemPath);
      const apiUrl = `/api/sharepoint/newsletter-archive?path=${encodedFilePath}`;

      console.log("Fetching newsletter archive file:", apiUrl);

      // Fetch content using fetch API
      const response = await fetch(apiUrl);

      if (response.ok) {
        const data = await response.json();
        if (data.content) {
          setSelectedFileContent(data.content);
        } else {
          throw new Error('No content returned from API');
        }
      } else {
        // Handle non-successful responses
        const errorText = await response.text();
        console.error(`Error fetching file: ${response.status} ${response.statusText}`, errorText);
        let specificError = `Could not load file content (${response.status}). Check permissions and file path.`;
        if (response.status === 404) {
          specificError = "File not found at the specified path. Check configuration.";
        } else if (response.status === 403) {
          specificError = "Permission denied accessing the file.";
        }
        setErrorMessage(specificError);
        setSelectedFileContent(null);
      }
    } catch (error: any) {
      console.error("Error fetching file content:", error);
      setErrorMessage("An unexpected error occurred while loading file content.");
      setSelectedFileContent(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[600px] rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto md:h-auto h-48">
        <h2 className="p-4 font-semibold text-lg text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">Newsletters</h2>
        <ul className="list-none p-0 m-0">
          {files.length === 0 && !errorMessage && (
            <li className="p-4 text-gray-500 dark:text-gray-400 italic">Loading files...</li>
          )}
          {files.map((file) => (
            <li key={file.path} className="border-b border-gray-200 dark:border-gray-700">
              <a
                href="#"
                className={cn(
                  "block py-3 px-4 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors",
                  activeFilePath === file.path && "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium border-l-3 border-amber-500"
                )}
                onClick={(e) => handleFileClick(e, file.path)}
                aria-busy={isLoading && activeFilePath === file.path}
                data-file-path={file.path}
              >
                {file.name}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col justify-center items-center bg-white dark:bg-gray-800">
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-4 text-gray-500 dark:text-gray-400">
            <Spinner size="lg" />
            <p>Loading file content...</p>
          </div>
        )}
        {!isLoading && errorMessage && (
          <p className="text-red-500 p-4 bg-red-100 dark:bg-red-900 dark:bg-opacity-20 rounded-md max-w-[80%] text-center">
            Error: {errorMessage}
          </p>
        )}
        {!isLoading && !errorMessage && !selectedFileContent && (
          <p className="text-gray-500 dark:text-gray-400 text-center p-8">
            Select a file from the list to view its content.
          </p>
        )}
        {!isLoading && !errorMessage && selectedFileContent && (
          <iframe
            id="content-frame"
            title="File Content"
            srcDoc={selectedFileContent}
            className="w-full h-full border-none bg-white"
            sandbox="allow-same-origin"
          >
            Your browser does not support iframes or srcdoc.
          </iframe>
        )}
      </div>
    </div>
  );
};

export default NewsletterArchive;
