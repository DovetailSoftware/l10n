function echo(s) {
	stdout.WriteLine(s)
}

function show_usage_and_exit(err_msg) {
	echo(err_msg + ", exiting.\n");
	echo("USAGE: CScript //E:JScript [options] ImportLocalizedGBSTListElement.js /file:full_path_to_input_file");
   echo("NOTE:  the input file must have been recently created by ExportLocalizedGBSTListElement.js!");
   WScript.Quit(-1);
}

var stdout = WScript.StdOut;

var constIForReading = 1;
var constBCreate = false;
var constIUnicode = -1;

var constIExpectedIndexOfLastDataElem = 4;
var constIIndexOfListName = 0;
var constIIndexOfRankValue = 1;
var constIIndexOfTitle = 2;
var constIIndexOfLocale = 3;
var constIIndexOfLocalizedValue = 4;

var file_name = WScript.Arguments.Named.Item("file");
if(!file_name) file_name = new String();
if(file_name == "") {
   show_usage_and_exit("file parameter was not provided and is required");
}

ifso = new ActiveXObject("Scripting.FileSystemObject");
inpf = ifso.OpenTextFile(file_name, constIForReading, constBCreate, constIUnicode);
if(!inpf) {
   show_usage_and_exit("Input file cannot be open or doesn't exist");
}

stdout.Write("Connecting to the database...");

var FCApp = WScript.CreateObject('FCFLCompat.FCApplication');
FCApp.Initialize();
var FCSession = FCApp.CreateSession();	
FCSession.LoginFromFCApp();

var boLocElm = FCSession.CreateGeneric('fc_loc_elm');
boLocElm.BulkName = "new_and_updated_strings";

//Accepted ,0            ,Accepted      ,pl-PL
//Accepted ,0            ,Accepted      ,pl-PL             ,Zaakceptowany
//    0        1               2            3                   4
//list_name,boElm("rank"),boElm("title"),boLocElm("locale"),boLocElm("title")

echo("\rImporting GBST lists' strings from file: " + file_name);

var list_name = "";

while (! inpf.AtEndOfStream) {
   var ibuf = inpf.ReadLine();
   var a = ibuf.split(",");
   if(a.length < constIExpectedIndexOfLastDataElem) {
      a = ibuf.split("	");
      if(a.length < constIExpectedIndexOfLastDataElem) continue;
   }
   if(list_name != a[constIIndexOfListName]) {
      list_name = a[constIIndexOfListName];
      echo("Importing '" + list_name + "' list");
   }
   if(a.length == constIExpectedIndexOfLastDataElem+1 && a[constIIndexOfLocale] != "" && a[constIIndexOfLocalizedValue] != "") {
      var boList = FCSession.CreateGeneric("gbst_lst");
      boList.AppendFilter("title","=",list_name);
      var boElm = FCSession.CreateGeneric("gbst_elm");
      boElm.TraverseFromParent(boList,"gbst_lst2gbst_elm");
      boElm.AppendFilter("title","=",a[constIIndexOfTitle]);
      boList.Query();

      try { var ElmObjid = boElm.Id } catch(e) { ElmObjid = 0 }
      if(ElmObjid != 0) {
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
      } else {
         echo("\nERROR: missing list element with title: " + a[constIIndexOfTitle] + " for list: " + list_name);
      }
   }
}

inpf.Close();

try {
   boLocElm.Bulk.UpdateAll();
} catch(e) {
   echo("\nERROR:\n" + e.description);
}

echo("\nFinished importing GBST lists' localized strings.");

FCSession.CloseAllGenerics();
FCSession.Logout();

//CScript //E:JScript ImportLocalizedGBSTListElement.js /file:"Problem Severity Level.txt"
//CScript //E:JScript ImportLocalizedGBSTListElement.js /file:mobilecl125.txt
