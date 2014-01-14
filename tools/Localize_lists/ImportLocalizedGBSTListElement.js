function echo(s) {
	stdout.WriteLine(s)
}

function show_usage_and_exit(err_msg) {
	echo(err_msg + ", exiting.\n");
	echo("USAGE 1: CScript //E:JScript ImportLocalizedGBSTListElement.js /file:full_path_to_input_file[,full_path_to_input_file]...");
	echo("USAGE 2: CScript //E:JScript ImportLocalizedGBSTListElement.js /folder:full_path_to_a_folder_with_input_file(s)");
	echo("USAGE 3: CScript //E:JScript ImportLocalizedGBSTListElement.js /folder:.");
   echo("NOTES  : the input file(s) must have been recently created by ExportLocalizedGBSTListElement.js!");
   echo("         the /folder parameter takes precedence over the /file parameter.");
   echo("         use /folder:. to import all *_GBST_*.txt files in current folder.");
   WScript.Quit(-1);
}

function findSeparator(a_string) {
   var retext = /(.)[a-z]{2}-[A-Z]{2}\1/;
   var separator;
   var wk = a_string.replace(retext,function($0,$1){separator = $1; return $0});
   return separator;
}

var stdout = WScript.StdOut;

var constIForReading = 1;
var constBCreate = false;
var constIUnicode = -1;

var constIExpectedIndexOfLastDataElem = 3;
var constIIndexOfListName = 0;
var constIIndexOfTitle = 1;
var constIIndexOfLocale = 2;
var constIIndexOfLocalizedValue = 3;
var files = [];
var errorFound = false;

var folder_name = WScript.Arguments.Named.Item("folder");
if(!folder_name) folder_name = new String();

var file_name = WScript.Arguments.Named.Item("file");
if(!file_name) file_name = new String();
if(file_name == "" && folder_name == "") {
   show_usage_and_exit("neither 'file' nor 'folder' parameter was provided but one is required");
}

stdout.Write("Connecting to the database...");

var FCApp = WScript.CreateObject('FCFLCompat.FCApplication');
FCApp.Initialize();
var FCSession = FCApp.CreateSession();	
FCSession.LoginFromFCApp();
var ifso = new ActiveXObject("Scripting.FileSystemObject");

if(folder_name != "") {
   try {
      echo("\rImporting GBST lists' strings from folder: " + folder_name + "\n");
      var folder = ifso.GetFolder(folder_name);
      var fc = new Enumerator(folder.files);
      for(; !fc.atEnd(); fc.moveNext()) {
         file_name = fc.item().name;
         if(file_name.indexOf("_GBST_") > 0) files.push(file_name);
      }
      folder = null;
      fc = null;
   } catch(e) {
      show_usage_and_exit("ERROR: " + e.description + " while processing " + folder_name + " folder");
   }
} else {
   echo("\rImporting GBST lists' strings from file(s): " + file_name + "\n");
   files = file_name.split(",");
}

for(l in files) {
   file_name = files[l];
   try {
      var inpf = ifso.OpenTextFile(file_name, constIForReading, constBCreate, constIUnicode);
      if(!inpf) {
         echo("Input file: '" + file_name + "' cannot be open or doesn't exist. Skipping...");
         errorFound = true;
         continue;
      }
      var list_name = "";

      while(! inpf.AtEndOfStream) {
         var ibuf = inpf.ReadLine();
         var separator = findSeparator(ibuf);
         if(!separator) {
            echo("ERROR: data separator cannot be determined for line: '" + ibuf + "'. Skipping...");
            errorFound = true;
            continue;
         }
         var a = ibuf.split(separator);
         if(a.length < constIExpectedIndexOfLastDataElem) continue;
         if(list_name != a[constIIndexOfListName]) {
            list_name = a[constIIndexOfListName];
            echo("Importing '" + list_name + "' list from file '" + file_name + "'");
         }
         if(a.length == constIExpectedIndexOfLastDataElem+1 && a[constIIndexOfLocale] != "" && a[constIIndexOfLocalizedValue] != "") {
            var boList = FCSession.CreateGeneric("gbst_lst");
            boList.AppendFilter("title","=",list_name);
            var boElm = FCSession.CreateGeneric("gbst_elm");
            boElm.TraverseFromParent(boList,"gbst_lst2gbst_elm");
            boElm.AppendFilter("title","=",a[constIIndexOfTitle]);
            boList.Query();
            if(boList.Count() == 0) {
               echo("List: '" + list_name + "' does not exist in this database.");
            } else {
               try { var ElmObjid = boElm.Id } catch(e) { ElmObjid = 0 }
               if(ElmObjid != 0) {
                  var boLocElm = FCSession.CreateGeneric('fc_loc_elm');
                  boLocElm.BulkName = "new_and_updated_strings";
                  var boCheckLocElm = FCSession.CreateGeneric('fc_loc_elm');
                  boCheckLocElm.BulkName = "existing_strings";
                  boCheckLocElm.AppendFilter("fc_loc_elm2gbst_elm","=",ElmObjid);
                  boCheckLocElm.AppendFilter("locale","=",a[constIIndexOfLocale]);
                  boCheckLocElm.Bulk.Query();
                  if(boCheckLocElm.Count() != 0) {
                     boLocElm.AddForUpdate(boCheckLocElm("objid")+0);
                  } else {
                     boLocElm.AddNew();
                  }
                  boCheckLocElm.CloseGeneric();
                  boCheckLocElm = null;

                  boLocElm("title")  = a[constIIndexOfLocalizedValue];
                  boLocElm("locale") = a[constIIndexOfLocale];
                  boLocElm.RelateById(ElmObjid, "fc_loc_elm2gbst_elm");
                  boLocElm.Bulk.UpdateAll();
                  boLocElm.CloseGeneric();
                  boLocElm = null;
               } else {
                  echo("\nERROR: missing list element with title: " + a[constIIndexOfTitle] + " for list: " + list_name);
                  errorFound = true;
               }
               boElm.CloseGeneric();
               boElm = null;
               boList.CloseGeneric();
               boList = null;
            }
         }
      }

      inpf.Close();
   } catch(e) {
      echo("ERROR: " + e.description + " while processing " + file_name + " file. Skipping...");
      errorFound = true;
   }
}

echo("\nFinished importing GBST lists' localized strings.");
if(errorFound) echo("SOME ERRORS HAVE BEEN FOUND, SEE MESSAGES ABOVE");

inpf = null;
ifso = null;
FCSession.Logout();

//CScript //E:JScript ImportLocalizedGBSTListElement.js /file:"Problem Severity Level_GBST_pl-PL.txt"
//CScript //E:JScript ImportLocalizedGBSTListElement.js /file:"Problem Severity Level_GBST_pl-PL.txt,Case Type_GBST_pl-PL.txt,Open_GBST_pl-PL.txt,Closed_GBST_pl-PL.txt,Response Priority Code_GBST_pl-PL.txt"
