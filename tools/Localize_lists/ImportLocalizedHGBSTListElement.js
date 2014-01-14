function echo(s) {
	stdout.WriteLine(s)
}

function show_usage_and_exit(err_msg) {
	echo(err_msg + ", exiting.\n");
	echo("USAGE 1: CScript //E:JScript ImportLocalizedHGBSTListElement.js /file:full_path_to_input_file[,full_path_to_input_file]...");
	echo("USAGE 2: CScript //E:JScript ImportLocalizedHGBSTListElement.js /folder:full_path_to_a_folder_with_input_file(s)");
	echo("USAGE 3: CScript //E:JScript ImportLocalizedHGBSTListElement.js /folder:.");
   echo("NOTES  : the input file(s) must have been recently created by ExportLocalizedHGBSTListElement.js!");
   echo("         the /folder parameter takes precedence over the /file parameter.");
   echo("         use /folder:. to import all *_HGBST_*.txt files in current folder.");
   WScript.Quit(-1);
}

function findSeparator(a_string) {
   var retext = /(.)[a-z]{2}-[A-Z]{2}\1/;
   var separator;
   var wk = a_string.replace(retext,function($0,$1){separator = $1; return $0});
   return separator;
}

function importAllShowsAndElmsForAList(boHgbstShow,elmObj,arrayIndex) {
   var showObjid = boHgbstShow("objid")+0;
   var elmObjid  = 0;
   var boLocElm  = null;
   var title     = a[arrayIndex];
   var locale    = "";
   var localized = "";
   var nextIndex = arrayIndex + 1;
   var boHgbstElm = FCSession.CreateGeneric("hgbst_elm");
   boHgbstElm.TraverseFromParent(boHgbstShow, "hgbst_show2hgbst_elm");
   boHgbstElm.DataFields = "title";
   boHgbstElm.BulkName = "hgbstelm_" + bulkNum++;
   boHgbstElm.AppendFilter("title","=",title);
   if(elmObj > 0) boHgbstElm.AppendFilter("objid", "<>", elmObj);

   if(arrayIndex == a.length-3) {
      locale    = a[arrayIndex + 1];
      localized = a[arrayIndex + 2];
      nextIndex = arrayIndex + 3;
      boLocElm = FCSession.CreateGeneric("fc_loc_elm");
      boLocElm.DataFields = "title";
      boLocElm.TraverseFromParent(boHgbstElm,"hgbst_elm2fc_loc_elm");
      boLocElm.AppendFilter("locale","=",locale);
      boLocElm.BulkName = boHgbstElm.BulkName;
   }

   boHgbstElm.Bulk.Query();

   if(!boHgbstElm.EOF) { 
      elmObjid = boHgbstElm.Id
      if(boLocElm) {
         if(boLocElm.Count() != 0) {
            boLocElm.AddForUpdate(boLocElm("objid")+0);
         } else {
            boLocElm.AddNew();
         }
         boLocElm("title")  = localized;
         boLocElm("locale") = locale;
         boLocElm.RelateById(boHgbstElm.Id, "fc_loc_elm2hgbst_elm");
         boLocElm.Update();
         boLocElm.CloseGeneric();
         boLocElm = null;
      }
   } else {
      echo("\nERROR: missing list element with title: " + title + " for list: " + list_name);
      errorFound = true;
      return;
   }

   boHgbstElm.CloseGeneric();
   boHgbstElm = null;

   if(a.length > nextIndex) importAllShowsAndElmsForAnElm(elmObjid,showObjid,nextIndex);
}

function importAllShowsAndElmsForAnElm(elmObjid,showObjid,nextIndex) {
   var boHgbstParElm = FCSession.CreateGeneric("hgbst_elm");
   boHgbstParElm.AppendFilter("objid", "=", elmObjid);
   boHgbstParElm.BulkName = "hgbstshow_" + bulkNum++;
   var boHgbstChildShow = FCSession.CreateGeneric("hgbst_show");
   boHgbstChildShow.BulkName = boHgbstParElm.BulkName;
   boHgbstChildShow.TraverseFromParent(boHgbstParElm, "hgbst_elm2hgbst_show");
   boHgbstChildShow.AppendFilter("objid", "<>", showObjid);
   boHgbstChildShow.Query();
   if(boHgbstChildShow.Count() > 0) {
      importAllShowsAndElmsForAList(boHgbstChildShow,elmObjid,nextIndex);
   }
   boHgbstChildShow.CloseGeneric();
   boHgbstChildShow = null;
   boHgbstParElm.CloseGeneric();
   boHgbstParElm = null;
}

var stdout = WScript.StdOut;

var constIExpectedMinimumRowLength = 4;
var constIForReading = 1;
var constBCreate = false;
var constIUnicode = -1;
var constIIndexOfListName = 0;
var bulkNum = 0;
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
      echo("\rImporting HGBST lists' strings from folder: " + folder_name + "\n");
      var folder = ifso.GetFolder(folder_name);
      var fc = new Enumerator(folder.files);
      for(; !fc.atEnd(); fc.moveNext()) {
         file_name = fc.item().name;
         if(file_name.indexOf("_HGBST_") > 0) files.push(file_name);
      }
      folder = null;
      fc = null;
   } catch(e) {
      show_usage_and_exit("ERROR: " + e.description + " while processing " + folder_name + " folder");
   }
} else {
   echo("\rImporting HGBST lists' strings from file(s): " + file_name + "\n");
   files = file_name.split(",");
}

for(l in files) {
   file_name = files[l];
   try {
      inpf = ifso.OpenTextFile(file_name, constIForReading, constBCreate, constIUnicode);
      if(!inpf) {
         echo("Input file: '" + file_name + "' cannot be open or doesn't exist. Skipping...");
         errorFound = true;
         continue;
      }

      var list_name = "";
      var a = [];

      while (! inpf.AtEndOfStream) {
         var ibuf = inpf.ReadLine();
         var separator = findSeparator(ibuf);
         if(!separator) {
            echo("ERROR: data separator cannot be determined for line: '" + ibuf + "'. Skipping...");
            errorFound = true;
            continue;
         }
         var a = ibuf.split(separator);
         if(list_name != a[constIIndexOfListName]) {
            list_name = a[constIIndexOfListName];
            echo("Importing '" + list_name + "' list from file '" + file_name + "'");
         }
         if(a.length >= constIExpectedMinimumRowLength) {
            var boHgbstLst = FCSession.CreateGeneric("hgbst_lst");
            boHgbstLst.BulkName = "hgbstlst_" + bulkNum++;
            boHgbstLst.AppendFilter("title","=",list_name);

            var boHgbstShow = FCSession.CreateGeneric("hgbst_show");
            boHgbstShow.TraverseFromParent(boHgbstLst, "hgbst_lst2hgbst_show");
            boHgbstShow.BulkName = boHgbstLst.BulkName;
            boHgbstLst.Bulk.Query();

            if(!boHgbstLst.EOF && !boHgbstShow.EOF) {
               importAllShowsAndElmsForAList(boHgbstShow,0,1);
            } else {
               echo("List: '" + list_name + "' does not exist in this database.");
               errorFound = true;
            }

            boHgbstShow.CloseGeneric();
            boHgbstShow = null;
            boHgbstLst.CloseGeneric();
            boHgbstLst = null;
         }
      }

      inpf.Close();
   } catch(e) {
      echo("ERROR: " + e.description + " while processing " + file_name + " file. Skipping...");
      errorFound = true;
   }
}

echo("\nFinished importing HGBST lists' localized strings.");
if(errorFound) echo("SOME ERRORS HAVE BEEN FOUND, SEE MESSAGES ABOVE");

inpf = null;
ifso = null;
FCSession.CloseAllGenerics();
FCSession.Logout();

//CScript //E:JScript ImportLocalizedHGBSTListElement.js /file:"Notification Types_HGBST_pl-PL.txt"
//CScript //E:JScript ImportLocalizedHGBSTListElement.js /file:"Contact Expertise_HGBST_pl-PL.txt,Contact Status_HGBST_pl-PL.txt,Email Types_HGBST_pl-PL.txt,Notification Types_HGBST_pl-PL.txt,Phone Types_HGBST_pl-PL.txt,Site Status_HGBST_pl-PL.txt,Site Type_HGBST_pl-PL.txt,Subcase Types_HGBST_pl-PL.txt,User Status_HGBST_pl-PL.txt,WORKGROUP_HGBST_pl-PL.txt"