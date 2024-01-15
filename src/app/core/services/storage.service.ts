import { Injectable } from '@angular/core';
import { keepUnstableUntilFirst } from '@angular/fire';
import { AngularFirestore, AngularFirestoreCollection  } from '@angular/fire/compat/firestore';
import { getDownloadURL , FirebaseStorage, getStorage, percentage, ref, StorageReference, uploadBytes, uploadBytesResumable, UploadTask, UploadTaskSnapshot } from '@angular/fire/storage';
import {catchError, concatMap, from, map, Observable, of, onErrorResumeNext, pipe, Subject, tap} from 'rxjs';
import {refFromURL} from "@angular/fire/database";
import {deleteObject} from "@firebase/storage";

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  
  private afStorage: FirebaseStorage;

  constructor(private readonly afs: AngularFirestore) { 
    this.afStorage = getStorage();
  }

  getDownloadUrlFromPath(path: string) {
    return from(getDownloadURL(ref(this.afStorage, path)));
  }

  uploadImage(path: string, file: File): [Observable<number>, Observable<UploadTaskSnapshot>]{

    const reference: StorageReference = ref(this.afStorage, path);
    const eventuallyDelete$ = from(getDownloadURL(reference)).pipe(
        catchError(err => {
          console.log("File " + path +  " not found! nothing to delete. Error is: " + JSON.stringify(err))
          return of("NF")
        }),
        concatMap(url => url === "NF" ? of() : from(deleteObject(reference)))
    )
    const task: UploadTask = uploadBytesResumable(reference, file);
    
    const progress$: Observable<number> = eventuallyDelete$.pipe(concatMap(x => percentage(task).pipe(map(value => value.progress)))) ;
    const snapshot$: Observable<UploadTaskSnapshot> = percentage(task).pipe(map(value => value.snapshot));
    return [progress$, snapshot$];
  }

  async getCollectionItemsByAttribute(collection: string, attribute: string, value: any): Promise<any[]> {
    // Reference the collection you want to query
    const collectionRef: AngularFirestoreCollection<any> = this.afs.collection('yourCollectionName');
  
    // Perform the query
    const query = collectionRef.ref.where(attribute, '==', value);
    const resSnap = await query.get()
    return resSnap.docs.map(doc => doc.data())
  }
  
}
