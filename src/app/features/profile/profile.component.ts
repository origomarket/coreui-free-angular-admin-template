import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from "@angular/router";
import { AuthService } from '@core/services/auth.service';
import { ToasterComponent } from '@coreui/angular';
import { OrigoSupplierUser } from 'src/app/core/model/OrigoSupplierUser';
import {StorageService} from "@core/services/storage.service";
import {Observable, of} from "rxjs";
@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit/*, AfterViewInit*/{

  user: OrigoSupplierUser | undefined = undefined;
  activeTab = 'my-messages'
  profilePhoto : string | undefined = undefined;

   // Backend notifications via toaster
  @ViewChild(ToasterComponent) toaster!: ToasterComponent

  constructor(
     private router: Router,
     private activatedRoute: ActivatedRoute,
     private authService: AuthService,
     private storageSvc: StorageService) {
    this.authService.userDomainSubscribe(user =>  {
      this.user = user;
    })
  }


  ngOnInit(): void {
    const lastSegment = this.activatedRoute.snapshot.children[0].url[0].path;
    this.activeTab = lastSegment.substring(lastSegment.lastIndexOf('/')+1);
    this.router.events.subscribe(event => {
      if(event instanceof NavigationEnd) {
        this.activeTab = event.url.substring(event.url.lastIndexOf('/')+1);
      }
    })
    this.userPhotoUrl().subscribe(url => this.profilePhoto = url)
  }

  getDisplayName() {
    let displayName = this.user != null ? this.user.displayName : ''
    return displayName;
  }

  getSupplier() {
    let supplier = this.user != null ? this.user.supplier : ''
    return supplier;
  }

   userPhotoUrl(): Observable<string> {
    return !!this.user ? this.storageSvc.getDownloadUrlFromPath(`users/${this.user?.uid}/images/profile`) : of('');
  }

  get email() {
    return !!this.user?.email ? this.user.email ?? '' : ''
  }


}
