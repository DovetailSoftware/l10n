l10n
====

Dovetail Software Localization Tool For Clarify-defined and User-defined Lists.


## Purpose:

This tool allows to export a list or a set of lists from Clarify/Amdocs database into individual files.
The files contain comma-separated text, one line per list element per local value.
These files can be modified in a text editor.
Then the files can be imported into the database to create/modify localized elements.

## Prerequisites:

- If the localized values contain any characters outside of ANSI character set the database must be capable of storing Unicode text. For example, for German, the ä, ö, ü, and ß characters do not require the database to be Unicode-enabled, whereas the ą, ę, ć, ż, and other Polish characters can only be stored in a Unicode-enabled database. Consult [this article] (http://dovetailsoftware.com/clarify/mpawelczyk/2008/08/19/unicode-database-conversion-and-usage/) for guidance on how to make a Clarify/Amdocs database Unicode-enabled.
- table_fc_loc_elm must be defined in the database schema.
- a list element to be localized must exist in the database.
- Dovetail Software's fcSDK must be installed on the computer running the tool.

## Assumptions:

- there are no duplicate title values in a Clarify list
- there are no duplicate title values at any level of a used-defined pop-up list
- title values do not contain commas or tabs.

## Methodology:

- localized values are stored in table_fc_loc_elm rows related to either:<br/>
-- table_gbst_elm rows for Clarify lists<br/>
-- table_hgbst_elm rows for used-defined pop-up lists
- each table_fc_loc_elm row stores the locale code of the value, in xx-XX format (as specified [here] (http://msdn.microsoft.com/en-us/library/ms533052%28vs.85%29.aspx), e.g. "pl-PL" for Polish).
- one row in table_gbst_elm or table_hgbst_elm table can have many related table_fc_loc_elm rows, one for each language in use.
- one row in table_fc_loc_elm can be related to only one row of either table_gbst_elm or table_hgbst_elm. The same row in table_fc_loc_elm can't be used to localize elements in both table_gbst_elm and table_hgbst_elm at the same time even if they store the same title value.
- it's not required to localize entire list. Individual elements can have as many localizations as needed, one per language, independently from each other.
- rows in table_gbst_elm and table_hgbst_elm are not modified by this tool.

## Notes:

- the tool allows for export-once-import-to-many approach which means the lists may be exported only once form a template database, localized, then imported to as many databases as needed, without having to go through export-edit steps for each database separately.
- Clarify list elements are searched for by title. If they are already localized, the localized values will be updated.
- used-defined pop-up list elements are searched for by title at a level they belong to. If they are already localized, the localized values will be updated.

## Preparations:

- install Dovetail Software's fcSDK.
- prepare connection info in fc.env file.
- make sure the table_fc_loc_elm is defined in the database schema. If it's not, use Dovetail Software Schema Editor to import \schema\l10n.schemascript.xml file.
- make the database Unicode-enabled if any localized values are expected to contain any characters outside of ANSI character set.

## Usage:

1. export a list first:<br/>
-- use ExportLocalizedGBSTListElement.js code for Clarify list(s)<br/>
-- use ExportLocalizedHGBSTListElement.js code for used-defined pop-up list(s)<br/>
-- language code must be specified in xx-XX format. If a language has only the xx symbol e.g. "af" for Afrikaans, use "af-AF".<br/>
-- a list is exported whole, no individual elements can be selected<br/>
-- each list exports to a separate file named list-name_GBST_locale.txt or list-name_HGBST_locale.txt.
2. modify exported file by adding a localized value at the end of each line of your choice. The value should be in a language indicated by locale code.<br/>
Important: <br/>
-- the file is encoded in Unicode format to allow language-specific characters.<br/>
-- use proper text editor capable of handling Unicode-encoded files.<br/>
-- do not convert the file to other encoding method to avoid data loss/misrepresentation.
3. import a list:<br/>
-- use ImportLocalizedGBSTListElement.js code for Clarify list(s)<br/>
-- use ImportLocalizedHGBSTListElement.js code for used-defined pop-up list(s)

## How to localize a Clarify list:

1. run export tool:<br/>
-- export individual list:<br/>
```CScript //E:JScript ExportLocalizedGBSTListElement.js /locale:xx-XX [/path:full_path_to_output_files] /list:list_name```<br/>
-- export multiple lists:
```CScript //E:JScript ExportLocalizedGBSTListElement.js /locale:xx-XX [/path:full_path_to_output_files] /list:list_name-1,list_name-2,...```<br/>
-- export all lists:<br/>
```CScript //E:JScript ExportLocalizedGBSTListElement.js /locale:xx-XX [/path:full_path_to_output_files]```<br/>
Notes:<br/>
-- /locale parameter is mandatory<br/>
-- if /path parameter is not used, output files will be created in current directory<br/>
-- if a list name contains blanks or any of "/%5C%3F%3A*%22%3C%3E%7C.%2C%27", enclose in double-quotes, e.g. /list:"Problem Severity Level"<br/>
-- each list exports into a separate file, e.g. "Problem Severity Level_GBST_pl-PL.txt".

2. edit the file:<br/>
-- file name example:<br/>
```Problem Severity Level_GBST_pl-PL.txt```<br/>
-- file format: <br/>
```list_name,title,locale,localized_value ```<br/>
-- exported data example: <br/>
```Problem Severity Level,High,pl-PL,``` <br/>
-- add or modify the localized_value at the end of the row: <br/>
```Problem Severity Level,High,pl-PL,Wysokie```

3. run import tool:<br/>
-- import individual list:<br/>
```CScript //E:JScript ImportLocalizedGBSTListElement.js /file:full_path_to_input_file```<br/>
-- import multiple lists:
```CScript //E:JScript ImportLocalizedGBSTListElement.js /file:full_path_to_input_file-1,full_path_to_input_file-2,...```<br/>
-- import all lists from current folder:
```CScript //E:JScript ImportLocalizedGBSTListElement.js /folder:.```<br/>
-- import all lists from specific folder:
```CScript //E:JScript ImportLocalizedGBSTListElement.js /folder:full_path_to_input_files```<br/>
Notes:<br/>
-- use /file parameter to run the tool for each list individually or specify multiple file names separated by commas.<br/>
-- use /folder parameter to run the tool for all list file names matching *_GBST_*.txt.<br/>
-- the /folder parameter takes precedence over the /file parameter.
-- if a file or folder name contains blanks, enclose in double-quotes, e.g. /file:"Problem Severity Level_GBST_pl-PL.txt"

## How to localize a used-defined pop-up list:

1. run export tool:<br/>
-- export individual list:<br/>
```CScript //E:JScript ExportLocalizedHGBSTListElement.js /locale:xx-XX [/path:full_path_to_output_files] /list:list_name```<br/>
-- export multiple lists:
```CScript //E:JScript ExportLocalizedHGBSTListElement.js /locale:xx-XX [/path:full_path_to_output_files] /list:list_name-1,list_name-2,...```<br/>
-- export all lists:
```CScript //E:JScript ExportLocalizedHGBSTListElement.js /locale:xx-XX [/path:full_path_to_output_files]```<br/>
Notes:<br/>
-- /locale parameter is mandatory<br/>
-- if /path parameter is not used, output files will be created in current directory<br/>
-- if a list name contains blanks or any of "/%5C%3F%3A*%22%3C%3E%7C.%2C%27", enclose in double-quotes, e.g. /list:"Notification Types"<br/>
-- each list exports into a separate file, e.g. "Notification Types_HGBST_pl-PL.txt".

2. edit the file:<br/>
-- file name example:<br/>
```Notification Types_HGBST_pl-PL.txt```<br/>
-- file format: <br/>
```list_name,title,locale,localized_value ``` <br/>
-- exported data example: <br/>
```Notification Types,Digital Pager,pl-PL,``` <br/>
-- add or modify the localized_value at the end of the row: <br/>
```Notification Types,Digital Pager,pl-PL,Przywoływacz cyfrowy```<br/>
Notes:<br/>
-- for a multi-level list, each element is fully qualified by elements at all preceding levels: <br/>
```list_name,title[,title]...,locale,localized_value ``` <br/>
-- for example: CR_DESC list, the "PC" -> "Windows 3.1" -> "16m" element is represented like this: <br/>
```CR_DESC,PC,Windows 3.1,16m,pl-PL,16 megabajtów ``` <br/>
-- only the last value in this path is localized, which is "16m".

3. run import tool:<br/>
-- import individual list:<br/>
```CScript //E:JScript ImportLocalizedHGBSTListElement.js /file:full_path_to_input_file```<br/>
-- import multiple lists:
```CScript //E:JScript ImportLocalizedHGBSTListElement.js /file:full_path_to_input_file-1,full_path_to_input_file-2,...```<br/>
-- import all lists from current folder:
```CScript //E:JScript ImportLocalizedHGBSTListElement.js /folder:.```<br/>
-- import all lists from specific folder:
```CScript //E:JScript ImportLocalizedHGBSTListElement.js /folder:full_path_to_input_files```<br/>
Notes:<br/>
-- use /file parameter to run the tool for each list individually or specify multiple file names separated by commas.<br/>
-- use /folder parameter to run the tool for all list file names matching *_HGBST_*.txt.<br/>
-- the /folder parameter takes precedence over the /file parameter.
-- if a file name contains blanks, enclose in double-quotes, e.g. /file:"Notification Types_HGBST_pl-PL.txt".

## Usage Tips:

* An alternate way to import all exported and localized lists in one run (per list type) without a need to specify all file names. To do this, merge all localized lists, e.g. into "cl125_GBST_pl-PL.txt" file for Clarify lists and into "cl125_HGBST_pl-PL.txt" file for used-defined pop-up lists. Then use these commands:<br/>
-- for Clarify lists:<br/>
```CScript //E:JScript ImportLocalizedGBSTListElement.js /file:"cl125_GBST_pl-PL.txt" ```<br/>
-- for used-defined pop-up lists:<br/>
```CScript //E:JScript ImportLocalizedHGBSTListElement.js /file:"cl125_HGBST_pl-PL.txt" ```<br/>
Note:<br/>
-- do not merge Clarify lists and used-defined pop-up lists into one file.